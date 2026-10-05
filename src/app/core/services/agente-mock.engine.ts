import {
  CampoIntent,
  EventoAgente,
  IntencionAgente,
  IntentUi,
  PasoTraza,
  PendienteAgente,
  RespuestaAgente,
} from '../models/agente.model';

/**
 * BYPASS TEMPORAL DE DESARROLLO — Motor mock del Agente IA (solo `isDevMode()`).
 *
 * Simula el grafo LangGraph de los diagramas 11–15 con una máquina de estados
 * pura y determinista: guardrail_entrada → router → subgrafo → interrupts
 * (dato, archivo, confirmación) → emitir_ui. No llama a ningún LLM.
 *
 * Garantías que replica del diseño:
 * - Ninguna escritura (radicar, referir, renovar) sin `confirmado: true`, que
 *   solo envía el botón Confirmar del lienzo. Escribir "sí" en el chat no basta.
 * - Los archivos llegan como id + tipo + nombre, nunca como binario.
 * - Solo se emiten intents de la lista cerrada de `IntentUi`.
 *
 * TODO: eliminar cuando exista el BFF `/api/v1/agente/mensajes`.
 */

/** Estado del hilo (espejo simplificado del TypedDict del diagrama 11). */
export interface EstadoHilo {
  readonly intencion: IntencionAgente | null;
  readonly paso: string;
  readonly campos: Readonly<Record<string, string>>;
  readonly docs: Readonly<Record<string, boolean>>;
}

export const ESTADO_INICIAL: EstadoHilo = {
  intencion: null,
  paso: 'inicio',
  campos: {},
  docs: {},
};

/** Resultado de procesar un evento: nuevo estado del hilo + respuesta al front. */
export interface ResultadoMotor {
  readonly estado: EstadoHilo;
  readonly respuesta: RespuestaAgente;
}

/** Salida parcial que arma cada subgrafo antes de completar la traza común. */
interface Salida {
  estado: EstadoHilo;
  mensajes: string[];
  intents: IntentUi[];
  pendiente: PendienteAgente;
  sugerencias: string[];
  traza: PasoTraza[];
}

const SUGERENCIAS_INICIO = [
  'Radícame una póliza de comercio sin administración, canon 1M',
  'Refiere a Juan Pérez, CC 1.234.567, cel 300 123 4567, para autos',
  'Renueva la póliza #10233 con los mismos valores',
  '¿Cuál es el estado de mis solicitudes?',
];

const ALCANCE =
  'Puedo ayudarte a cotizar, radicar pólizas de arrendamiento, referir clientes, renovar pólizas, consultar tus solicitudes y entregarte formatos.';

/** Patrones de prompt injection que bloquea guardrail_entrada. */
const PATRONES_INJECTION: readonly RegExp[] = [
  /ignora\s+(todas\s+)?(las\s+)?(instrucciones|reglas)/,
  /olvida\s+(tus|las)\s+(instrucciones|reglas)/,
  /system\s*prompt|prompt\s+del\s+sistema/,
  /<\s*script|javascript:/,
  /act[uú]a\s+como\s+(administrador|admin|root)/,
  /mu[eé]strame\s+(los\s+)?datos\s+de\s+otros?\s+brokers?/,
];

/** Normaliza texto: minúsculas y sin tildes, para el router. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Formatea pesos colombianos sin decimales. */
export function formatearCop(valor: number): string {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

/** Hash corto y determinista para radicados simulados. */
function hashCorto(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

/**
 * Extrae un monto en pesos de un texto: "1M", "1,5 millones", "$1.000.000",
 * "2500000". Devuelve `null` si no encuentra uno.
 */
export function extraerMonto(texto: string): number | null {
  const t = normalizar(texto);
  const millones = t.match(/(\d+(?:[.,]\d+)?)\s*(m\b|mill?on(?:es)?|palos?)/);
  if (millones) {
    return Math.round(parseFloat(millones[1].replace(',', '.')) * 1_000_000);
  }
  const miles = t.match(/(\d+(?:[.,]\d+)?)\s*(k\b|mil\b)/);
  if (miles) {
    return Math.round(parseFloat(miles[1].replace(',', '.')) * 1_000);
  }
  const pesos = t.match(/\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d{5,})/);
  if (pesos) {
    return parseInt(pesos[1].replace(/[.,]/g, ''), 10);
  }
  return null;
}

/** Router: clasifica la intención (structured output en el grafo real). */
export function clasificarIntencion(texto: string): IntencionAgente | null {
  const t = normalizar(texto);
  if (/\brefier|\breferir|\breferido/.test(t)) return 'referir';
  if (/\brenov|\brenuev|no la renueves|no renovar/.test(t)) return 'renovar';
  if (/\bradic/.test(t)) return 'radicar';
  if (/\bcotiz|cuanto (vale|cuesta|sale)/.test(t)) return 'cotizar';
  if (/\bformato|formulario|\bplantilla|sarlaft en blanco/.test(t)) return 'documentos';
  if (/\bestado\b|mis solicitudes|seguimiento|\bcomo va\b/.test(t)) return 'consultar';
  return null;
}

/** Punto de entrada: procesa un evento del broker sobre el estado del hilo. */
export function procesarEvento(
  estadoPrevio: EstadoHilo | undefined,
  evento: EventoAgente,
): ResultadoMotor {
  const estado = estadoPrevio ?? ESTADO_INICIAL;
  const salida = despachar(estado, evento);
  return {
    estado: salida.estado,
    respuesta: {
      hiloId: evento.hiloId,
      mensajes: salida.mensajes,
      intents: salida.intents,
      pendiente: salida.pendiente,
      sugerencias: salida.sugerencias,
      traza: [
        ...salida.traza,
        { nodo: 'guardrail_salida', tipo: 'guardrail', detalle: 'esquema de intents OK · sin PII' },
      ],
    },
  };
}

function nuevaSalida(estado: EstadoHilo, traza: PasoTraza[] = []): Salida {
  return { estado, mensajes: [], intents: [], pendiente: null, sugerencias: [], traza };
}

function despachar(estado: EstadoHilo, evento: EventoAgente): Salida {
  // --- Confirmación humana (solo desde el botón del lienzo) ---
  if (evento.confirmado !== undefined) {
    return resolverConfirmacion(estado, evento.confirmado, evento.hiloId);
  }

  // --- Archivo ya subido al backend (llega solo el id) ---
  if (evento.archivo) {
    return resolverArchivo(estado, evento.archivo);
  }

  const texto = (evento.mensaje ?? '').trim();
  const t = normalizar(texto);
  const traza: PasoTraza[] = [
    { nodo: 'BFF', tipo: 'guardrail', detalle: 'sesión válida · rate limit OK · PII redactada en el prompt' },
  ];

  // --- guardrail_entrada ---
  if (PATRONES_INJECTION.some((p) => p.test(t))) {
    traza.push({ nodo: 'guardrail_entrada', tipo: 'guardrail', detalle: 'bloqueado: intento de prompt injection' });
    traza.push({ nodo: 'END', tipo: 'fin', detalle: 'respuesta fija' });
    const s = nuevaSalida(estado, traza);
    s.mensajes.push('No puedo hacer eso. Solo actúo con tus permisos de broker y dentro de los flujos del portal. ' + ALCANCE);
    s.sugerencias = SUGERENCIAS_INICIO.slice(0, 3);
    return s;
  }
  traza.push({ nodo: 'guardrail_entrada', tipo: 'guardrail', detalle: 'OK' });

  // Texto libre mientras el grafo espera la confirmación: no confirma.
  if (estado.paso === 'confirmar') {
    const s = nuevaSalida(estado, traza);
    s.mensajes.push('Para enviar la solicitud usa el botón Confirmar del resumen. Si quieres cambiar algo, cancela y dime qué ajustar.');
    s.pendiente = 'confirmacion';
    return s;
  }

  // ¿Nueva intención o respuesta a un interrupt en curso?
  const intencion = clasificarIntencion(texto);
  const continua = estado.intencion !== null && estado.paso !== 'fin';
  const cambia =
    intencion !== null &&
    (!continua || (intencion !== estado.intencion && !(estado.intencion === 'cotizar' && intencion === 'radicar')));

  if (cambia || (intencion === 'radicar' && estado.intencion === 'cotizar')) {
    traza.push({ nodo: 'router', tipo: 'router', detalle: `intención = ${intencion}` });
    const base: EstadoHilo =
      intencion === 'radicar' && estado.intencion === 'cotizar'
        ? { ...estado, intencion: 'radicar' }
        : { ...ESTADO_INICIAL, intencion };
    return subgrafo(base, texto, traza, true);
  }

  if (continua) {
    traza.push({ nodo: 'router', tipo: 'router', detalle: `retoma ${estado.intencion} · Command(resume)` });
    return subgrafo(estado, texto, traza, false);
  }

  // Saludo o fuera de alcance.
  traza.push({ nodo: 'router', tipo: 'router', detalle: 'sin intención del portal' });
  traza.push({ nodo: 'END', tipo: 'fin', detalle: 'respuesta fija' });
  const s = nuevaSalida(estado, traza);
  s.mensajes.push(
    /^(hola|buen(os|as)|hey|que tal)/.test(t)
      ? '¡Hola! Soy el agente de Proyectiva. ' + ALCANCE + ' ¿Qué hacemos?'
      : 'Eso está fuera de lo que puedo hacer. ' + ALCANCE,
  );
  s.sugerencias = SUGERENCIAS_INICIO;
  return s;
}

function subgrafo(estado: EstadoHilo, texto: string, traza: PasoTraza[], nuevo: boolean): Salida {
  switch (estado.intencion) {
    case 'cotizar':
    case 'radicar':
      return subgrafoRadicar(estado, texto, traza, nuevo);
    case 'referir':
      return subgrafoReferir(estado, texto, traza);
    case 'renovar':
      return subgrafoRenovar(estado, texto, traza, nuevo);
    case 'documentos':
      return subgrafoDocumentos(estado, traza);
    case 'consultar':
      return subgrafoConsultar(estado, texto, traza);
    default:
      return nuevaSalida(estado, traza);
  }
}

// =============================================================================
// Subgrafo cotizar / radicar (diagrama 13)
// =============================================================================

const CIUDADES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Villavicencio', 'Chía', 'Soacha'];

function extraerDatosCotizacion(campos: Record<string, string>, texto: string): Record<string, string> {
  const t = normalizar(texto);
  const c = { ...campos };
  if (!c['destino']) {
    if (/comerci|local|oficina|bodega/.test(t)) c['destino'] = 'Comercio';
    else if (/vivienda|apartamento|apto|casa|residencial/.test(t)) c['destino'] = 'Vivienda';
  }
  if (/sin admin/.test(t)) c['admon'] = '0';
  const admin = t.match(/admin(?:istracion)?\s*(?:de\s*)?(\$?\s?[\d.,]+\s*(?:m|mil|millones?|k)?)/);
  if (admin && !/sin admin/.test(t)) {
    const v = extraerMonto(admin[1]);
    if (v !== null) c['admon'] = String(v);
  }
  const canonTxt = t.match(/canon\s*(?:de\s*)?(\$?\s?[\d.,]+\s*(?:m\b|mil\b|millones?|k\b)?)/);
  if (canonTxt) {
    const v = extraerMonto(canonTxt[1]);
    if (v !== null) c['canon'] = String(v);
  } else if (c['destino'] && !c['canon'] && c['esperando'] === 'canon') {
    const v = extraerMonto(texto);
    if (v !== null) c['canon'] = String(v);
  }
  const ciudad = CIUDADES.find((x) => t.includes(normalizar(x)));
  if (ciudad) c['ciudad'] = ciudad;
  return c;
}

function camposCotizacion(c: Readonly<Record<string, string>>): CampoIntent[] {
  return [
    { etiqueta: 'Destino', valor: c['destino'] ?? '—' },
    { etiqueta: 'Canon', valor: c['canon'] ? formatearCop(+c['canon']) : '—' },
    { etiqueta: 'Administración', valor: c['admon'] !== undefined ? formatearCop(+c['admon']) : '—' },
    { etiqueta: 'Ciudad', valor: c['ciudad'] ?? '—' },
  ];
}

/** Cotización simulada: prima 42% del total mensual (12 meses) + IVA 19%. */
export function calcularCotizacion(canon: number, admon: number): { total: number; prima: number; iva: number; totalPoliza: number } {
  const total = canon + admon;
  const prima = Math.round(total * 0.42);
  const iva = Math.round(prima * 0.19);
  return { total, prima, iva, totalPoliza: prima + iva };
}

function subgrafoRadicar(estado: EstadoHilo, texto: string, traza: PasoTraza[], nuevo: boolean): Salida {
  const s = nuevaSalida(estado, traza);
  const radicar = estado.intencion === 'radicar';

  // Paso "estudio": número de estudio del inquilino.
  if (estado.paso === 'estudio') {
    const num = texto.replace(/\D/g, '');
    if (num.length < 5 || num.length > 10) {
      s.mensajes.push('El número de estudio debe tener entre 5 y 10 dígitos. ¿Me lo compartes de nuevo?');
      s.pendiente = 'dato';
      s.traza.push({ nodo: 'completar_datos', tipo: 'interrupt', detalle: 'estudio inválido · pregunta de nuevo' });
      return s;
    }
    s.estado = { ...estado, paso: 'cedula', campos: { ...estado.campos, estudio: num } };
    s.traza.push({ nodo: 'esperar_archivo', tipo: 'interrupt', detalle: 'cédula del propietario' });
    s.mensajes.push(`Estudio ${num} anotado. Ahora adjunta la cédula del propietario (o del apoderado si él firma el contrato).`);
    s.intents.push(
      { tipo: 'llenar', flujo: 'radicacion', campos: [...camposCotizacion(s.estado.campos), { etiqueta: 'N.º de estudio', valor: num }] },
      {
        tipo: 'solicitar_archivos',
        titulo: 'Cédula del firmante',
        reglas: [{ id: 'cedula_propietario', etiqueta: 'Cédula del propietario', descripcion: 'PDF o imagen legible por ambas caras' }],
      },
    );
    s.pendiente = 'archivo';
    return s;
  }

  if (estado.paso === 'cedula' || estado.paso === 'sarlaft' || estado.paso === 'docs') {
    s.mensajes.push('Estoy esperando el documento. Adjúntalo desde la tarjeta del lienzo.');
    s.pendiente = 'archivo';
    return s;
  }

  // Tras cotizar, "radícala" continúa desde la cotización.
  if (radicar && estado.campos['cotizado'] === 'si') {
    s.estado = { ...estado, paso: 'estudio' };
    s.traza.push({ nodo: 'radicar', tipo: 'router', detalle: 'reutiliza la cotización del hilo' });
    s.traza.push({ nodo: 'completar_datos', tipo: 'interrupt', detalle: 'número de estudio' });
    s.mensajes.push('Perfecto, la radicamos. Para radicar necesito el número de estudio del inquilino.');
    s.pendiente = 'dato';
    return s;
  }

  // Paso "datos": destino, canon y ciudad.
  const campos = extraerDatosCotizacion(estado.campos, texto);
  s.traza.push({ nodo: radicar ? 'radicar' : 'cotizar', tipo: 'router', detalle: nuevo ? 'extrae datos del mensaje' : 'completa datos' });
  const faltante = !campos['destino'] ? 'destino' : !campos['canon'] ? 'canon' : !campos['ciudad'] ? 'ciudad' : null;

  if (faltante) {
    const preguntas: Record<string, [string, string[]]> = {
      destino: ['¿El inmueble es para vivienda o para comercio?', ['Vivienda', 'Comercio']],
      canon: ['¿Cuál es el valor del canon mensual?', ['$1.500.000', '$2.000.000', '$3.000.000']],
      ciudad: ['¿En qué ciudad está el inmueble?', ['Bogotá', 'Medellín', 'Cali']],
    };
    const [pregunta, sug] = preguntas[faltante];
    s.estado = { ...estado, paso: 'datos', campos: { ...campos, esperando: faltante } };
    s.traza.push({ nodo: 'completar_datos', tipo: 'interrupt', detalle: `falta ${faltante}` });
    s.intents.push({ tipo: 'llenar', flujo: radicar ? 'radicacion' : 'cotizacion', campos: camposCotizacion(campos) });
    s.mensajes.push(pregunta);
    s.sugerencias = sug;
    s.pendiente = 'dato';
    return s;
  }

  const admon = campos['admon'] !== undefined ? +campos['admon'] : 0;
  const cot = calcularCotizacion(+campos['canon'], admon);
  const camposFin = { ...campos, admon: String(admon), cotizado: 'si', esperando: '' };
  s.traza.push({ nodo: 'cotizar', tipo: 'tool', detalle: 'POST /cotizaciones · CotizacionRequest' });
  s.traza.push({ nodo: 'generar_pdf_cotizacion', tipo: 'tool', detalle: 'URL firmada de corta vida' });
  s.traza.push({ nodo: 'emitir_ui', tipo: 'ui', detalle: 'mostrar(cotizacion) + entregar_documento' });
  s.intents.push(
    { tipo: 'llenar', flujo: radicar ? 'radicacion' : 'cotizacion', campos: camposCotizacion(camposFin) },
    {
      tipo: 'mostrar',
      tarjeta: 'cotizacion',
      titulo: 'Cotización · 12 meses',
      tono: 'info',
      campos: [
        { etiqueta: 'Valor total a asegurar', valor: formatearCop(cot.total) },
        { etiqueta: 'Prima', valor: formatearCop(cot.prima) },
        { etiqueta: 'IVA 19%', valor: formatearCop(cot.iva) },
        { etiqueta: 'Total póliza', valor: formatearCop(cot.totalPoliza) },
      ],
    },
    {
      tipo: 'entregar_documento',
      nombre: 'Cotizacion-Proyectiva.pdf',
      descripcion: 'Cotización lista para compartir con el propietario',
      url: '/api/v1/documentos/firmados/cotizacion',
    },
  );
  s.mensajes.push(`Esta es la cotización de lo que me indicas: total póliza ${formatearCop(cot.totalPoliza)} (PDF adjunto en el lienzo).`);

  if (!radicar) {
    s.estado = { ...estado, paso: 'fin', campos: camposFin };
    s.sugerencias = ['Radícala', 'Cotiza otra'];
    return s;
  }
  s.estado = { ...estado, paso: 'estudio', campos: camposFin };
  s.traza.push({ nodo: 'completar_datos', tipo: 'interrupt', detalle: 'número de estudio' });
  s.mensajes.push('Para radicar necesito el número de estudio del inquilino.');
  s.pendiente = 'dato';
  return s;
}

// =============================================================================
// Archivos (esperar_archivo) — radicar y renovar
// =============================================================================

function resolverArchivo(estado: EstadoHilo, archivo: NonNullable<EventoAgente['archivo']>): Salida {
  const s = nuevaSalida(estado, [
    { nodo: 'BFF', tipo: 'guardrail', detalle: `archivo guardado en el almacén · al grafo solo llega ${archivo.id}` },
  ]);
  const n = normalizar(archivo.nombre);

  if (estado.intencion === 'renovar' && estado.paso === 'sarlaft') {
    s.traza.push({ nodo: 'validar_sarlaft_renov.', tipo: 'tool', detalle: 'reconsulta con documento · vigente' });
    s.intents.push({
      tipo: 'mostrar', tarjeta: 'sarlaft', titulo: 'SARLAFT vigente', tono: 'success',
      campos: [{ etiqueta: 'Resultado', valor: 'Vigente (actualizado hoy)' }],
    });
    s.mensajes.push('SARLAFT vigente.');
    return pedirConfirmacionRenovacion({ ...estado, docs: { ...estado.docs, sarlaft: true } }, s);
  }

  if (estado.paso === 'cedula') {
    s.traza.push({ nodo: 'validar_documento', tipo: 'tool', detalle: 'OCR: número leído vs. digitado' });
    if (/otro|equivocad/.test(n)) {
      s.intents.push({
        tipo: 'mostrar', tarjeta: 'documentos', titulo: 'Validación de documentos', tono: 'danger', campos: [],
        documentos: [{ etiqueta: 'Cédula del propietario', ok: false, motivo: 'La cédula no corresponde al propietario' }],
      });
      s.mensajes.push('La cédula no corresponde al propietario. Adjunta la del propietario o la del apoderado que firma.');
      s.pendiente = 'archivo';
      return s;
    }
    const ultimo = (estado.campos['estudio'] ?? '').slice(-1);
    s.traza.push({ nodo: 'consultar_sarlaft', tipo: 'tool', detalle: 'POST /radicaciones/sarlaft · 3 salidas' });
    if (ultimo === '3') {
      s.estado = { ...estado, paso: 'fin' };
      s.traza.push({ nodo: 'END', tipo: 'fin', detalle: 'consultable → Warehouse' });
      s.intents.push({
        tipo: 'mostrar', tarjeta: 'sarlaft', titulo: 'SARLAFT consultable', tono: 'info',
        campos: [{ etiqueta: 'Resultado', valor: 'Consultable: el caso pasa al Warehouse para gestión manual' }],
      });
      s.mensajes.push('El SARLAFT quedó como consultable: el trámite pasa al equipo en el Warehouse y te avisarán. Aquí termina la radicación.');
      s.sugerencias = ['¿Cuál es el estado de mis solicitudes?'];
      return s;
    }
    if (ultimo === '2') {
      s.estado = { ...estado, paso: 'sarlaft' };
      s.traza.push({ nodo: 'esperar_archivo', tipo: 'interrupt', detalle: 'SARLAFT desactualizado · nuevo formulario' });
      s.intents.push(
        {
          tipo: 'mostrar', tarjeta: 'sarlaft', titulo: 'SARLAFT desactualizado', tono: 'warning',
          campos: [{ etiqueta: 'Resultado', valor: 'Desactualizado: el firmante debe diligenciar el formulario' }],
        },
        { tipo: 'entregar_documento', nombre: 'SARLAFT-B114.pdf', descripcion: 'Formulario SARLAFT persona natural', url: '/api/v1/documentos/firmados/sarlaft-b114' },
        {
          tipo: 'solicitar_archivos', titulo: 'SARLAFT diligenciado',
          reglas: [{ id: 'sarlaft', etiqueta: 'SARLAFT firmado', descripcion: 'Formulario B-114 completo y firmado' }],
        },
      );
      s.mensajes.push('El SARLAFT del firmante está desactualizado. Te dejo el formulario; cuando lo tengas firmado, adjúntalo y reconsulto.');
      s.pendiente = 'archivo';
      return s;
    }
    return pedirDocumentos({ ...estado, docs: {} }, s, 'SARLAFT pasó OK.');
  }

  if (estado.paso === 'sarlaft') {
    s.traza.push({ nodo: 'consultar_sarlaft', tipo: 'tool', detalle: 'reconsulta · actualizado' });
    return pedirDocumentos({ ...estado, docs: {} }, s, 'Reconsulté el SARLAFT y ya está actualizado.');
  }

  if (estado.paso === 'docs') {
    const tipo = archivo.tipo === 'ctl' ? 'ctl' : 'cedula';
    const vencido = tipo === 'ctl' && /vencid|viej|antigu/.test(n);
    s.traza.push({ nodo: 'validar_documento', tipo: 'tool', detalle: `${tipo.toUpperCase()} · ${vencido ? 'rechazado' : 'OK'}` });
    const docs = { ...estado.docs, [tipo]: !vencido };
    const estadoDocs = { ...estado, docs };
    s.estado = estadoDocs;
    s.intents.push({
      tipo: 'mostrar', tarjeta: 'documentos', titulo: 'Validación de documentos', tono: vencido ? 'danger' : 'success', campos: [],
      documentos: [
        estadoDocumento('Cédula', docs['cedula']),
        estadoDocumento('Certificado de tradición y libertad', docs['ctl'], vencido ? 'Tiene 120 días de expedido (máx. 90)' : undefined),
      ],
    });
    if (vencido) {
      s.mensajes.push('El CTL no sirve: tiene 120 días de expedido y el máximo es 90. Adjunta uno más reciente.');
      s.pendiente = 'archivo';
      return s;
    }
    if (!(docs['cedula'] && docs['ctl'])) {
      s.mensajes.push('Recibido. Falta el otro documento.');
      s.pendiente = 'archivo';
      return s;
    }
    return pedirConfirmacionRadicacion(estadoDocs, s);
  }

  s.mensajes.push('No estaba esperando un archivo en este momento.');
  return s;
}

function estadoDocumento(etiqueta: string, ok: boolean | undefined, motivoRechazo?: string) {
  return {
    etiqueta,
    ok: ok === true,
    motivo: ok === true ? 'Validado' : ok === false ? motivoRechazo ?? 'Rechazado' : 'Pendiente',
  };
}

function pedirDocumentos(estado: EstadoHilo, s: Salida, prefijo: string): Salida {
  s.estado = { ...estado, paso: 'docs' };
  s.traza.push({ nodo: 'buscar_formato', tipo: 'tool', detalle: 'requisitos persona natural' });
  s.traza.push({ nodo: 'esperar_archivo', tipo: 'interrupt', detalle: 'cédula + CTL' });
  s.intents.push(
    {
      tipo: 'mostrar', tarjeta: 'sarlaft', titulo: 'SARLAFT actualizado', tono: 'success',
      campos: [{ etiqueta: 'Resultado', valor: 'Actualizado' }],
    },
    {
      tipo: 'solicitar_archivos', titulo: 'Documentos de la radicación',
      reglas: [
        { id: 'cedula', etiqueta: 'Cédula', descripcion: 'Del propietario, legible' },
        { id: 'ctl', etiqueta: 'Certificado de tradición y libertad', descripcion: 'Expedido hace máximo 90 días' },
      ],
    },
  );
  s.mensajes.push(`${prefijo} Ahora carga la cédula y el certificado de tradición y libertad.`);
  s.pendiente = 'archivo';
  return s;
}

function pedirConfirmacionRadicacion(estado: EstadoHilo, s: Salida): Salida {
  const c = estado.campos;
  const cot = calcularCotizacion(+c['canon'], +(c['admon'] ?? 0));
  s.estado = { ...estado, paso: 'confirmar' };
  s.traza.push({ nodo: 'confirmar_escritura', tipo: 'interrupt', detalle: 'arma RadicacionRequest · espera clic' });
  s.intents.push({
    tipo: 'confirmar',
    accion: 'Radicar póliza de arrendamiento',
    endpoint: 'POST /api/v1/radicaciones',
    resumen: [
      ...camposCotizacion(c),
      { etiqueta: 'N.º de estudio', valor: c['estudio'] ?? '—' },
      { etiqueta: 'Total póliza', valor: formatearCop(cot.totalPoliza) },
      { etiqueta: 'Documentos', valor: 'Cédula ✓ · CTL ✓ · SARLAFT ✓' },
    ],
  });
  s.mensajes.push('Todo listo. Revisa el resumen y confirma para radicar.');
  s.pendiente = 'confirmacion';
  return s;
}

// =============================================================================
// Subgrafo referir (diagrama 14)
// =============================================================================

const PRODUCTOS: readonly [RegExp, string][] = [
  [/auto|carro|vehicul|moto/, 'Seguro de Carros'],
  [/hogar|casa/, 'Seguro de Hogar'],
  [/vida/, 'Seguro de Vida'],
  [/salud/, 'Seguro de Salud'],
  [/arriendo|arrendamiento/, 'Póliza de Arrendamiento'],
];

function extraerReferido(campos: Record<string, string>, texto: string, esperando: string | undefined): Record<string, string> {
  const c = { ...campos };
  const t = normalizar(texto);
  const nombre = texto.match(/refier[ea]\s+a\s+([A-Za-zÁÉÍÓÚÑáéíóúñ ]+?)(?=,|\s+cc\b|\s+c\.c|\s+con\b|\s+cel|\s+para\b|$)/i);
  if (nombre) c['nombre'] = nombre[1].trim();
  const cc = t.match(/(?:\bcc\b|c\.c\.?|cedula)\s*:?\s*([\d.]{6,15})/);
  if (cc) c['cedula'] = cc[1].replace(/\D/g, '');
  const cel = t.match(/(?:cel(?:ular)?|tel(?:efono)?|whatsapp)\s*:?\s*(?:\+?57)?\s*(3\d{2}[\s-]?\d{3}[\s-]?\d{4})/);
  if (cel) c['celular'] = cel[1].replace(/\D/g, '');
  const prod = PRODUCTOS.find(([re]) => re.test(t));
  if (prod) c['producto'] = prod[1];

  // Respuesta directa a la pregunta del interrupt.
  if (esperando === 'nombre' && !nombre && texto.trim()) c['nombre'] = texto.trim();
  if (esperando === 'cedula' && !cc) {
    const d = texto.replace(/\D/g, '');
    if (d.length >= 6 && d.length <= 12) c['cedula'] = d;
  }
  if (esperando === 'celular' && !cel) {
    const d = texto.replace(/\D/g, '').replace(/^57/, '');
    if (/^3\d{9}$/.test(d)) c['celular'] = d;
  }
  if (esperando === 'producto' && !prod && texto.trim()) c['producto'] = texto.trim();
  return c;
}

function subgrafoReferir(estado: EstadoHilo, texto: string, traza: PasoTraza[]): Salida {
  const s = nuevaSalida(estado, traza);
  const campos = extraerReferido(estado.campos, texto, estado.campos['esperando']);
  const resumen: CampoIntent[] = [
    { etiqueta: 'Nombre', valor: campos['nombre'] ?? '—' },
    { etiqueta: 'Cédula', valor: campos['cedula'] ?? '—' },
    { etiqueta: 'Celular', valor: campos['celular'] ?? '—' },
    { etiqueta: 'Producto', valor: campos['producto'] ?? '—' },
  ];
  s.intents.push({ tipo: 'llenar', flujo: 'referido', campos: resumen });
  s.traza.push({ nodo: 'referir', tipo: 'router', detalle: 'extrae nombre · CC · celular · producto' });

  const faltante = (['nombre', 'cedula', 'celular', 'producto'] as const).find((k) => !campos[k]);
  if (faltante) {
    const preguntas: Record<string, [string, string[]]> = {
      nombre: ['¿Cuál es el nombre completo del cliente?', []],
      cedula: ['¿Cuál es su número de cédula?', []],
      celular: ['¿Cuál es su celular? (10 dígitos, empieza por 3)', []],
      producto: ['¿Para qué producto lo refieres?', ['Seguro de Carros', 'Seguro de Hogar', 'Seguro de Vida']],
    };
    s.estado = { ...estado, paso: 'datos', campos: { ...campos, esperando: faltante } };
    s.traza.push({ nodo: 'completar_datos', tipo: 'interrupt', detalle: `falta ${faltante}` });
    s.mensajes.push(preguntas[faltante][0]);
    s.sugerencias = preguntas[faltante][1];
    s.pendiente = 'dato';
    return s;
  }

  s.estado = { ...estado, paso: 'confirmar', campos: { ...campos, esperando: '' } };
  s.traza.push({ nodo: 'ui_llenar', tipo: 'ui', detalle: 'formulario Referir lleno · validarReferido OK' });
  s.traza.push({ nodo: 'confirmar_escritura', tipo: 'interrupt', detalle: 'arma ReferidoRequest · espera clic' });
  s.intents.push({ tipo: 'confirmar', accion: 'Registrar referido', endpoint: 'POST /api/v1/referidos', resumen });
  s.mensajes.push(`Listo, llené el referido para ${campos['producto']}. ¿Confirmas?`);
  s.pendiente = 'confirmacion';
  return s;
}

// =============================================================================
// Subgrafo renovar (diagrama 15)
// =============================================================================

function subgrafoRenovar(estado: EstadoHilo, texto: string, traza: PasoTraza[], nuevo: boolean): Salida {
  const s = nuevaSalida(estado, traza);
  const t = normalizar(texto);
  const c: Record<string, string> = { ...estado.campos };

  if (estado.paso === 'sarlaft') {
    s.mensajes.push('Estoy esperando el SARLAFT actualizado. Adjúntalo desde la tarjeta del lienzo.');
    s.pendiente = 'archivo';
    return s;
  }

  const poliza = texto.match(/#?\s?(\d{4,})/);
  if (poliza) c['poliza'] = poliza[1];
  if (nuevo || !c['gestion']) {
    if (/no la renueves|no renovar|no se renueva|vendio|venta/.test(t)) {
      c['gestion'] = 'no_renovar';
      c['motivo'] = /vend|venta/.test(t) ? 'Venta del inmueble' : /precio|caro/.test(t) ? 'Precio' : 'Otro';
    } else if (/otro ?si|cesion/.test(t)) {
      c['gestion'] = /cesion/.test(t) ? 'cesion' : 'otro_si';
    } else if (/fisic|formulario/.test(t)) {
      c['gestion'] = 'fisica';
    } else {
      c['gestion'] = 'digital';
    }
  }

  if (!c['poliza']) {
    s.estado = { ...estado, paso: 'datos', campos: c };
    s.traza.push({ nodo: 'completar_datos', tipo: 'interrupt', detalle: 'falta número de póliza' });
    s.mensajes.push('¿Qué póliza quieres gestionar? Dame el número.');
    s.sugerencias = ['#10233', '#10231'];
    s.pendiente = 'dato';
    return s;
  }

  const etiquetas: Record<string, string> = {
    digital: 'Renovación digital · condiciones actuales',
    fisica: 'Renovación física · formulario firmado',
    otro_si: 'Caso especial · Otro Sí',
    cesion: 'Caso especial · Cesión',
    no_renovar: 'No renovar',
  };
  s.traza.push({ nodo: 'portafolio_renov.', tipo: 'tool', detalle: `GET /renovaciones/portafolio · #${c['poliza']}` });
  s.intents.push({
    tipo: 'llenar', flujo: 'renovacion',
    campos: [
      { etiqueta: 'Póliza', valor: `#${c['poliza']}` },
      { etiqueta: 'Gestión', valor: etiquetas[c['gestion']] },
      ...(c['gestion'] === 'digital' ? [{ etiqueta: 'Ajuste', valor: 'Sin ajuste (bloqueado)' }] : []),
      ...(c['motivo'] ? [{ etiqueta: 'Motivo', valor: c['motivo'] }] : []),
    ],
  });

  const estadoPoliza: EstadoHilo = { ...estado, campos: c };
  if (c['gestion'] === 'no_renovar') {
    s.mensajes.push(`Encontré la póliza #${c['poliza']}. Registraré la no renovación por "${c['motivo']}".`);
    return pedirConfirmacionRenovacion(estadoPoliza, s);
  }

  s.traza.push({ nodo: 'validar_sarlaft_renov.', tipo: 'tool', detalle: 'POST /renovaciones/sarlaft' });
  if (c['poliza'] === '10233') {
    s.estado = { ...estadoPoliza, paso: 'sarlaft' };
    s.traza.push({ nodo: 'esperar_archivo', tipo: 'interrupt', detalle: 'SARLAFT no vigente' });
    s.intents.push(
      {
        tipo: 'mostrar', tarjeta: 'sarlaft', titulo: 'SARLAFT no vigente', tono: 'warning',
        campos: [{ etiqueta: 'Antigüedad', valor: '4 años y 2 meses (máx. 36 meses)' }],
      },
      {
        tipo: 'solicitar_archivos', titulo: 'SARLAFT actualizado',
        reglas: [{ id: 'sarlaft', etiqueta: 'SARLAFT actualizado', descripcion: 'Formulario firmado por el propietario' }],
      },
    );
    s.mensajes.push(`Encontré la póliza #${c['poliza']}. La renuevo con ${etiquetas[c['gestion']].toLowerCase()}. El SARLAFT tiene 4 años y 2 meses: no está vigente. Adjunta el certificado actualizado.`);
    s.pendiente = 'archivo';
    return s;
  }
  s.intents.push({
    tipo: 'mostrar', tarjeta: 'sarlaft', titulo: 'SARLAFT vigente', tono: 'success',
    campos: [{ etiqueta: 'Antigüedad', valor: '11 meses' }],
  });
  s.mensajes.push(`Encontré la póliza #${c['poliza']} y su SARLAFT está vigente.`);
  return pedirConfirmacionRenovacion(estadoPoliza, s);
}

function pedirConfirmacionRenovacion(estado: EstadoHilo, s: Salida): Salida {
  const c = estado.campos;
  const endpoints: Record<string, [string, string]> = {
    digital: ['Enviar renovación digital', 'POST /api/v1/renovaciones/solicitudes'],
    fisica: ['Enviar renovación física', 'POST /api/v1/renovaciones/solicitudes'],
    otro_si: ['Registrar caso especial (Otro Sí)', 'POST /api/v1/renovaciones/casosEspeciales'],
    cesion: ['Registrar caso especial (Cesión)', 'POST /api/v1/renovaciones/casosEspeciales'],
    no_renovar: ['Registrar no renovación', 'POST /api/v1/renovaciones/noRenovacion'],
  };
  const [accion, endpoint] = endpoints[c['gestion']];
  s.estado = { ...estado, paso: 'confirmar' };
  s.traza.push({ nodo: 'confirmar_escritura', tipo: 'interrupt', detalle: 'arma el DTO · espera clic' });
  s.intents.push({
    tipo: 'confirmar', accion, endpoint,
    resumen: [
      { etiqueta: 'Póliza', valor: `#${c['poliza']}` },
      { etiqueta: 'Gestión', valor: accion },
      ...(c['motivo'] ? [{ etiqueta: 'Motivo', valor: c['motivo'] }] : []),
      ...(c['gestion'] === 'digital' ? [{ etiqueta: 'Modalidad', valor: 'Mismos valores (sin ajuste)' }] : []),
    ],
  });
  s.mensajes.push('Revisa el resumen y confirma para enviarlo.');
  s.pendiente = 'confirmacion';
  return s;
}

// =============================================================================
// Confirmación humana (confirmar_escritura → tool de escritura)
// =============================================================================

function resolverConfirmacion(estado: EstadoHilo, confirmado: boolean, hiloId: string): Salida {
  const s = nuevaSalida(estado, [
    { nodo: 'BFF', tipo: 'guardrail', detalle: `confirmado=${confirmado} · clic humano auditado` },
  ]);
  if (estado.paso !== 'confirmar') {
    s.mensajes.push('No hay nada pendiente por confirmar.');
    return s;
  }
  if (!confirmado) {
    s.estado = { ...estado, paso: 'fin' };
    s.traza.push({ nodo: 'END', tipo: 'fin', detalle: 'cancelado · no se ejecutó ningún POST' });
    s.mensajes.push('Cancelado. No envié nada. Dime qué quieres ajustar.');
    s.sugerencias = SUGERENCIAS_INICIO.slice(0, 3);
    return s;
  }

  const id = hashCorto(hiloId + JSON.stringify(estado.campos));
  s.estado = { ...estado, paso: 'fin' };
  if (estado.intencion === 'referir') {
    s.traza.push({ nodo: 'referir', tipo: 'tool', detalle: 'POST /referidos · token OBO' });
    s.intents.push(
      { tipo: 'mostrar', tarjeta: 'exito', titulo: 'Referido registrado', tono: 'success', campos: [{ etiqueta: 'Radicado', valor: `REF-${id}` }] },
      { tipo: 'navegar', ruta: 'estado-referidos', etiqueta: 'Ver estado de referidos' },
    );
    s.mensajes.push(`Referido registrado con radicado REF-${id}.`);
  } else if (estado.intencion === 'renovar') {
    s.traza.push({ nodo: 'solicitar_renovacion', tipo: 'tool', detalle: 'POST /renovaciones · token OBO' });
    s.intents.push(
      { tipo: 'mostrar', tarjeta: 'exito', titulo: 'Solicitud enviada', tono: 'success', campos: [{ etiqueta: 'Radicado', valor: `REN-${id}` }] },
      { tipo: 'navegar', ruta: 'renovaciones', etiqueta: 'Ir a Renovaciones' },
    );
    s.mensajes.push(`Listo. Tu solicitud quedó registrada con el radicado REN-${id}.`);
  } else {
    s.traza.push({ nodo: 'radicar', tipo: 'tool', detalle: 'POST /radicaciones · token OBO · el controller revalida' });
    s.intents.push(
      { tipo: 'mostrar', tarjeta: 'exito', titulo: 'Póliza radicada', tono: 'success', campos: [{ etiqueta: 'Código de solicitud', valor: `BR-${id}` }] },
      { tipo: 'navegar', ruta: 'seguimiento', etiqueta: 'Ver en Seguimiento' },
    );
    s.mensajes.push(`¡Radicada! Código de solicitud BR-${id}. Puedes seguirla en Seguimiento.`);
  }
  s.traza.push({ nodo: 'END', tipo: 'fin', detalle: 'eventos SSE al lienzo' });
  s.sugerencias = ['¿Cuál es el estado de mis solicitudes?'];
  return s;
}

// =============================================================================
// Subgrafos de solo lectura: documentos y consultar
// =============================================================================

function subgrafoDocumentos(estado: EstadoHilo, traza: PasoTraza[]): Salida {
  const s = nuevaSalida({ ...estado, paso: 'fin' }, traza);
  s.traza.push({ nodo: 'buscar_formato', tipo: 'tool', detalle: 'GET /documentos/recursos' });
  s.intents.push(
    { tipo: 'entregar_documento', nombre: 'SARLAFT-B114.pdf', descripcion: 'SARLAFT persona natural', url: '/api/v1/documentos/firmados/sarlaft-b114' },
    { tipo: 'entregar_documento', nombre: 'SARLAFT-B115.pdf', descripcion: 'SARLAFT persona jurídica', url: '/api/v1/documentos/firmados/sarlaft-b115' },
    { tipo: 'entregar_documento', nombre: 'Formulario-Renovacion.pdf', descripcion: 'Formulario de renovación', url: '/api/v1/documentos/firmados/renovacion' },
  );
  s.mensajes.push('Te dejé los formatos más usados en el lienzo.');
  return s;
}

function subgrafoConsultar(estado: EstadoHilo, texto: string, traza: PasoTraza[]): Salida {
  const s = nuevaSalida({ ...estado, paso: 'fin' }, traza);
  const ref = texto.match(/#\s?(\d{4,})/);
  s.traza.push({
    nodo: ref ? 'detalle_solicitud' : 'consultar_solicitudes',
    tipo: 'tool',
    detalle: ref ? `GET /solicitudes/${ref[1]} · PII enmascarada` : 'GET /solicitudes?size=4',
  });
  s.intents.push(
    {
      tipo: 'mostrar', tarjeta: 'solicitudes', titulo: 'Tus solicitudes recientes', tono: 'info',
      campos: [
        { etiqueta: '#10234 · J*** P***', valor: 'Radicada' },
        { etiqueta: '#10233 · M*** S***', valor: 'En revisión' },
        { etiqueta: '#10232 · C*** M***', valor: 'Bloqueada: falta CTL' },
        { etiqueta: '#10231 · L*** F***', valor: 'Radicada' },
      ],
    },
    { tipo: 'navegar', ruta: 'seguimiento', etiqueta: 'Abrir Seguimiento' },
  );
  s.mensajes.push('Tienes 4 solicitudes recientes; la #10232 está bloqueada porque falta el certificado de tradición y libertad.');
  s.sugerencias = ['Renueva la póliza #10233 con los mismos valores'];
  return s;
}
