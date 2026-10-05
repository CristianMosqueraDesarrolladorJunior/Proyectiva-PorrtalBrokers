import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { EventoAgente } from '../models/agente.model';
import { EstadoHilo, procesarEvento } from '../services/agente-mock.engine';

/**
 * BYPASS TEMPORAL DE DESARROLLO — Mock del API_Backend (solo `isDevMode()`).
 *
 * Mientras el API_Backend (`/api/v1/...`) no exista, este interceptor responde con
 * datos de ejemplo fieles al prototipo para poder recorrer toda la experiencia
 * (Seguimiento, Cotizador, Calendario, Documentos, Ayuda, Referidos, Pólizas).
 * NO aplica en producción (el build optimizado desactiva `isDevMode`).
 *
 * TODO: eliminar este interceptor cuando el API_Backend esté disponible.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isDevMode()) {
    return next(req);
  }
  const respuesta = resolverMock(req.method, req.url, req.body);
  if (respuesta === undefined) {
    return next(req);
  }
  // Simula latencia de red para ver loaders y transiciones.
  return of(
    new HttpResponse({ status: 200, body: respuesta }),
  ).pipe(delay(300)) as Observable<HttpEvent<unknown>>;
};

/** Ciudades con cobertura por departamento (fiel al prototipo `updateCotCities`). */
const CIUDADES_POR_DEPARTAMENTO: Readonly<Record<string, readonly string[]>> = {
  cundinamarca: ['Bogotá', 'Chía', 'Zipaquirá', 'Soacha', 'Facatativá'],
  valle: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá'],
  meta: ['Villavicencio', 'Acacías', 'Granada'],
  antioquia: ['Medellín', 'Envigado', 'Bello', 'Itagüí'],
  atlantico: ['Barranquilla', 'Soledad', 'Malambo'],
  otro: [],
};

/** Listado completo de solicitudes de ejemplo para el Seguimiento (Req 6). */
const SOLICITUDES = [
  { referencia: '#10234', cliente: 'Juan Pérez Gómez', producto: 'Arrendamiento Residencial', estado: 'radicada', estadoPago: 'Recaudada', fecha: '22 may 2026', comision: 224000 },
  { referencia: '#10233', cliente: 'María Antonia Silva', producto: 'Arrendamiento Comercial', estado: 'en_revision', estadoPago: 'Pendiente de pago', fecha: '21 may 2026', comision: 0 },
  { referencia: '#10232', cliente: 'Carlos Mendoza Torres', producto: 'Arrendamiento Residencial', estado: 'bloqueada', estadoPago: 'Pendiente de pago', fecha: '20 may 2026', comision: 0 },
  { referencia: '#10231', cliente: 'Lucía Fernández Vargas', producto: 'Arrendamiento Residencial', estado: 'radicada', estadoPago: 'Recaudada', fecha: '19 may 2026', comision: 248000 },
  { referencia: '#10230', cliente: 'Andrés Felipe Ríos', producto: 'Arrendamiento Comercial', estado: 'en_revision', estadoPago: 'Pendiente de pago', fecha: '18 may 2026', comision: 0 },
  { referencia: '#10229', cliente: 'Valentina Castro Mora', producto: 'Arrendamiento Residencial', estado: 'observada', estadoPago: 'Pendiente de pago', fecha: '17 may 2026', comision: 0 },
  { referencia: '#10228', cliente: 'Roberto Sánchez Pinto', producto: 'Arrendamiento Residencial', estado: 'radicada', estadoPago: 'Recaudada', fecha: '16 may 2026', comision: 152000 },
  { referencia: '#10227', cliente: 'Diana Ospina Ruíz', producto: 'Arrendamiento Comercial', estado: 'en_revision', estadoPago: 'Pendiente de pago', fecha: '15 may 2026', comision: 0 },
  { referencia: '#10226', cliente: 'Miguel Torres Leal', producto: 'Arrendamiento Residencial', estado: 'radicada', estadoPago: 'Recaudada', fecha: '14 may 2026', comision: 198000 },
  { referencia: '#10225', cliente: 'Camila Herrera Blanco', producto: 'Arrendamiento Residencial', estado: 'bloqueada', estadoPago: 'Pendiente de pago', fecha: '13 may 2026', comision: 0 },
  { referencia: '#10224', cliente: 'Sofía Ramírez León', producto: 'Arrendamiento Residencial', estado: 'aprobada', estadoPago: 'Recaudada', fecha: '12 may 2026', comision: 210000 },
  { referencia: '#10223', cliente: 'Jorge Vélez Cano', producto: 'Arrendamiento Comercial', estado: 'radicada', estadoPago: 'Recaudada', fecha: '11 may 2026', comision: 175000 },
];

/** Estado de cada hilo del agente (el checkpointer Postgres en el diseño real). */
const HILOS_AGENTE = new Map<string, EstadoHilo>();

/**
 * Resuelve la respuesta mock para una ruta del API_Backend.
 * @returns el cuerpo de respuesta, o `undefined` si la ruta no está mockeada.
 */
function resolverMock(metodo: string, url: string, cuerpo: unknown): unknown {
  const ruta = url.split('?')[0];
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';

  // --- Autenticación ---
  if (ruta.endsWith('/api/v1/auth/session') && metodo === 'GET') {
    return { nombre: 'Juan Pablo Restrepo', rol: 'Broker' };
  }
  if (ruta.endsWith('/api/v1/auth/logout') && metodo === 'POST') {
    return null;
  }

  // --- Agente IA (diagramas 10–15): BFF simulado con estado por hilo ---
  if (ruta.endsWith('/api/v1/agente/mensajes') && metodo === 'POST') {
    const evento = cuerpo as EventoAgente;
    const { estado, respuesta } = procesarEvento(HILOS_AGENTE.get(evento.hiloId), evento);
    HILOS_AGENTE.set(evento.hiloId, estado);
    return respuesta;
  }

  // --- Dashboard: comisiones y KPIs (Req 5) ---
  if (ruta.endsWith('/api/v1/dashboard/comisiones')) {
    return {
      valorEstimado: 624000,
      periodo: 'Mayo 2026',
      polizasRadicadas: 142,
      desglose: [
        { producto: 'Arrendamiento Residencial', valor: 410000 },
        { producto: 'Arrendamiento Comercial', valor: 154000 },
        { producto: 'Seguro de Hogar', valor: 60000 },
      ],
    };
  }
  if (ruta.endsWith('/api/v1/dashboard/kpis')) {
    return { primasGeneradas: 350000, totalRadicadas: 142, enRevision: 12, bloqueadas: 3 };
  }

  // --- Seguimiento: listado filtrado y paginado (Req 6) ---
  if (ruta.endsWith('/api/v1/solicitudes') && metodo === 'GET') {
    return listarSolicitudes(query);
  }
  // --- Detalle de solicitud (Req 34) ---
  if (ruta.includes('/api/v1/solicitudes/') && metodo === 'GET') {
    return detalleSolicitud(decodeURIComponent(ruta.split('/solicitudes/')[1]));
  }

  // --- Cotizador: ciudades y cálculo (Req 7, 8) ---
  if (ruta.endsWith('/api/v1/cobertura/ciudades')) {
    const depto = normalizarDepartamento(leerParam(query, 'departamento'));
    return CIUDADES_POR_DEPARTAMENTO[depto] ?? [];
  }
  if (ruta.endsWith('/api/v1/cotizaciones') && metodo === 'POST') {
    return cotizacionMock(cuerpo);
  }

  // --- Coberturas (Req 14) ---
  if (ruta.endsWith('/api/v1/coberturas')) {
    // Coberturas del prototipo: solo "Daños y faltantes" y "Servicios públicos".
    return [
      { id: 'danios', nombre: 'Daños y faltantes', descripcion: 'Protege el inventario de daños causados por el inquilino. Desde $500.000', montoDefecto: 500000, pasoMonto: 500000 },
      { id: 'servicios', nombre: 'Servicios públicos', descripcion: 'Cubrimos servicios pendientes del inquilino. Ya incluye $1.000.000. Desde $500.000', montoDefecto: 500000, pasoMonto: 500000 },
    ];
  }

  // --- Referidos: KPIs y listado (Req 15) ---
  if (ruta.endsWith('/api/v1/referidos') && metodo === 'GET') {
    return referidosMock();
  }
  if (ruta.endsWith('/api/v1/referidos') && metodo === 'POST') {
    return { radicado: '#REF-2026-0345', estado: 'En proceso' };
  }

  // --- Pólizas por cédula (Req 16) ---
  if (ruta.endsWith('/api/v1/polizas')) {
    return [
      { numero: '#POL-88213', cliente: 'Juan Pérez Gómez', producto: 'Arrendamiento', fechaVencimiento: '30 jun 2026', estado: 'Próxima a renovar' },
      { numero: '#POL-88110', cliente: 'Juan Pérez Gómez', producto: 'Seguro de Hogar', fechaVencimiento: '15 jun 2026', estado: 'A punto de vencer' },
      { numero: '#POL-87540', cliente: 'Juan Pérez Gómez', producto: 'Arrendamiento', fechaVencimiento: '10 dic 2026', estado: 'Renovada' },
    ];
  }

  // --- Calendario (Req 33.1, 33.2) ---
  if (ruta.endsWith('/api/v1/calendario/eventos')) {
    return [
      { titulo: 'Carlos Andrés M. · Arrendamiento #ARR-10234', fecha: '2026-10-15', estado: 'urgente' },
      { titulo: 'Marta Rodríguez P. · Seguro de Vida #VID-44510', fecha: '2026-10-18', estado: 'proximo' },
      { titulo: 'Renovación póliza #POL-88213', fecha: '2026-10-22', estado: 'proximo' },
      { titulo: 'Vencimiento estudio EST-2026-001234', fecha: '2026-10-28', estado: 'urgente' },
    ];
  }

  // --- Documentos descargables (Req 33.3, 33.4) ---
  if (ruta.endsWith('/api/v1/documentos/recursos')) {
    return [
      { id: 'f1', nombre: 'Formato de radicación de póliza', categoria: 'formatos', url: '#' },
      { id: 'f2', nombre: 'Formato de novedades', categoria: 'formatos', url: '#' },
      { id: 'p1', nombre: 'Plantilla de contrato de arrendamiento', categoria: 'plantillas', url: '#' },
      { id: 'p2', nombre: 'Plantilla carta de no renovación', categoria: 'plantillas', url: '#' },
      { id: 'c1', nombre: 'Clausulado arrendamiento residencial', categoria: 'clausulados', url: '#' },
      { id: 'c2', nombre: 'Clausulado arrendamiento comercial', categoria: 'clausulados', url: '#' },
      { id: 'i1', nombre: 'Instructivo de radicación paso a paso', categoria: 'instructivos', url: '#' },
      { id: 'i2', nombre: 'Instructivo SARLAFT 4.0', categoria: 'instructivos', url: '#' },
    ];
  }

  // --- Ayuda: contactos, PQRS y FAQs (Req 33.5, 33.6) ---
  if (ruta.endsWith('/api/v1/ayuda/faqs')) {
    return {
      contactos: [
        { canal: 'Línea de soporte', valor: '01 8000 123 456' },
        { canal: 'Correo', valor: 'soporte.brokers@segurosbolivar.com' },
        { canal: 'WhatsApp', valor: '+57 300 123 4567' },
      ],
      pqrs: 'https://www.segurosbolivar.com/pqrs',
      faqs: [
        { pregunta: '¿Cómo radico una nueva póliza?', respuesta: 'Ingresa a "Nueva radicación", diligencia los datos del propietario y carga los documentos requeridos según el tipo de persona.' },
        { pregunta: '¿Cuánto tarda la revisión de una radicación?', respuesta: 'El tiempo promedio de revisión es de 6 horas hábiles.' },
        { pregunta: '¿Cómo renuevo una póliza próxima a vencer?', respuesta: 'Desde "Renovaciones" o "Calendario", selecciona la póliza y elige la modalidad de renovación.' },
        { pregunta: '¿Qué es la validación SARLAFT 4.0?', respuesta: 'Es el proceso de conocimiento del cliente. Si no se completa digitalmente, debes cargar el formulario manualmente.' },
      ],
    };
  }

  // --- Radicación, contrato, nuevo negocio, corrección, renovaciones (confirmaciones) ---
  // --- Registro de broker (Req 3): SARLAFT del aspirante y Transicion_Registro ---
  if (ruta.endsWith('/api/v1/sarlaft/consultas') && metodo === 'POST') {
    const req = (cuerpo ?? {}) as { fechaExpedicion?: string; documento?: string; correo?: string };
    if (req.fechaExpedicion) {
      return { nivel: 'exito', fechaExpedicion: req.fechaExpedicion, estado: 'Vigente', vigencia: 'Menor a 3 años' };
    }
    return resolverSarlaftRegistro(req.documento ?? '', req.correo ?? '');
  }
  if (ruta.endsWith('/api/v1/brokers/prospectos') && metodo === 'POST') {
    return { radicado: '#PRO-2026-0342', estado: 'PROSPECTO' };
  }
  if (ruta.endsWith('/api/v1/brokers/solicitudesRegistro') && metodo === 'POST') {
    // La cuenta queda como PROSPECTO mientras se revisa la documentación.
    return { radicado: '#REG-2026-0187', estado: 'PROSPECTO' };
  }
  if (ruta.endsWith('/api/v1/radicaciones/estudio') && metodo === 'POST') {
    return resolverEstudioRadicacion(cuerpo);
  }
  if (ruta.endsWith('/api/v1/radicaciones/sarlaft') && metodo === 'POST') {
    return resolverSarlaftRadicacion(cuerpo);
  }
  if (ruta.endsWith('/api/v1/radicaciones') && metodo === 'POST') {
    return { radicado: '#RAD-2026-4521', estado: 'Radicada' };
  }
  if (ruta.endsWith('/api/v1/contratos/arrendamiento') && metodo === 'POST') {
    return { radicado: '#CTR-2026-0912', estado: 'Generado' };
  }
  if (ruta.endsWith('/api/v1/nuevosNegocios/resumen') && metodo === 'POST') {
    return { primaBase: 1200000, gastosAdministrativos: 80000, descuento: 120000, total: 1160000, comisionBroker: 116000 };
  }
  if (ruta.endsWith('/api/v1/nuevosNegocios') && metodo === 'POST') {
    return { radicado: '#NN-2026-0231', estado: 'Recibido', primaTotal: 1160000 };
  }
  if (ruta.endsWith('/api/v1/correcciones') && metodo === 'POST') {
    return { radicado: '#COR-2026-0145', estado: 'En revisión' };
  }
  // --- Portafolio de renovaciones (Req 16, 17) ---
  if (ruta.endsWith('/api/v1/renovaciones/portafolio') && metodo === 'GET') {
    return {
      total: 18,
      renovadas: 6,
      proximasARenovar: 7,
      aPuntoDeVencer: 5,
      polizas: [
        { numero: '#10234', cliente: 'Juan Pérez Gómez', producto: 'Arrendamiento Residencial', fechaVencimiento: '23 ago 2026', estado: 'Próxima a renovar' },
        { numero: '#10233', cliente: 'María Antonia Silva', producto: 'Arrendamiento Comercial', fechaVencimiento: '15 jul 2026', estado: 'A punto de vencer' },
        { numero: '#10231', cliente: 'Lucía Fernández Vargas', producto: 'Arrendamiento Residencial', fechaVencimiento: '10 sep 2026', estado: 'Próxima a renovar' },
        { numero: '#10228', cliente: 'Roberto Sánchez Pinto', producto: 'Arrendamiento Residencial', fechaVencimiento: '05 jun 2026', estado: 'Renovada' },
        { numero: '#10226', cliente: 'Miguel Torres Leal', producto: 'Arrendamiento Comercial', fechaVencimiento: '20 ago 2026', estado: 'Próxima a renovar' },
      ],
    };
  }

  if (ruta.endsWith('/api/v1/renovaciones/sarlaft') && metodo === 'POST') {
    return resolverSarlaftRenovacion(cuerpo);
  }
  if (ruta.includes('/api/v1/renovaciones') && metodo === 'POST') {
    return { radicado: '#RN-2026-1123', estado: 'Procesando' };
  }

  return undefined;
}

/** Construye la página de solicitudes filtrada/paginada (Req 6.2, 6.5). */
function listarSolicitudes(query: string): unknown {
  const page = Number(leerParam(query, 'page') || '0');
  const size = Number(leerParam(query, 'size') || '10');
  const busqueda = leerParam(query, 'busqueda').toLowerCase();
  const producto = leerParam(query, 'producto');
  const estado = leerParam(query, 'estado');

  let filtradas = SOLICITUDES.slice();
  if (busqueda) {
    filtradas = filtradas.filter(
      (s) =>
        s.cliente.toLowerCase().includes(busqueda) ||
        s.referencia.toLowerCase().includes(busqueda),
    );
  }
  if (producto) {
    filtradas = filtradas.filter((s) => s.producto === producto);
  }
  if (estado) {
    filtradas = filtradas.filter((s) => s.estado === estado);
  }

  const total = filtradas.length;
  const inicio = page * size;
  const items = filtradas.slice(inicio, inicio + size);
  return { items, total, page, size };
}

/** Construye el detalle de una solicitud con su línea de tiempo (Req 34). */
function detalleSolicitud(referencia: string): unknown {
  const base =
    SOLICITUDES.find((s) => s.referencia === referencia) ?? SOLICITUDES[0];
  return {
    ...base,
    timeline: [
      { titulo: 'Radicación recibida', fecha: '2026-05-22', completado: true },
      { titulo: 'Documentos validados', fecha: '2026-05-22', completado: true },
      { titulo: 'En revisión de suscripción', fecha: '2026-05-23', completado: false },
      { titulo: 'Póliza emitida', fecha: '', completado: false },
    ],
  };
}

/**
 * Construye la cotización a partir del request (Req 8.2–8.5): tasa 3.0% si el
 * valor asegurado mensual (canon + administración) > $9.000.000, si no 3.5%;
 * IVA = 19% de la prima neta; total = prima neta + IVA por concepto.
 */
function cotizacionMock(cuerpo: unknown): unknown {
  const req = (cuerpo ?? {}) as {
    ciudad?: string;
    canon?: number;
    administracion?: number;
    mesesVigencia?: number;
    coberturas?: readonly { id: string; activa: boolean; montoAsegurado: number }[];
  };
  const canon = Number(req.canon ?? 0);
  const administracion = Number(req.administracion ?? 0);
  const meses = Number(req.mesesVigencia ?? 12);
  const valorMensual = canon + administracion;
  // Reglas del prototipo: Villavicencio 3%; > $9M mensuales 3%; resto 3.5%.
  const esVillavicencio = (req.ciudad ?? '').toLowerCase().includes('villavicencio');
  const tasa = esVillavicencio || valorMensual > 9_000_000 ? 3.0 : 3.5;
  const TASA_COBERTURAS = 5.0;

  interface ConceptoMock {
    concepto: string;
    valorAsegurado: number;
    meses: number;
    baseCalculoPeriodo: number;
    tasa: number;
    primaNeta: number;
    iva: number;
    total: number;
  }
  const conceptos: ConceptoMock[] = [];
  const agregar = (nombre: string, valorAsegurado: number, tasaAplicada: number, sobrePeriodo: boolean): void => {
    const base = valorAsegurado * meses;
    // Seguro principal: prima sobre el período; coberturas: 5% sobre el monto (prototipo).
    const primaNeta = Math.round((sobrePeriodo ? base : valorAsegurado) * (tasaAplicada / 100));
    const iva = Math.round(primaNeta * 0.19);
    conceptos.push({
      concepto: nombre,
      valorAsegurado,
      meses,
      baseCalculoPeriodo: base,
      tasa: tasaAplicada,
      primaNeta,
      iva,
      total: primaNeta + iva,
    });
  };

  agregar('Seguro Principal (Arrendamiento + Admon.)', valorMensual, tasa, true);
  const principalPrimaNeta = conceptos[0].primaNeta;
  for (const cob of req.coberturas ?? []) {
    if (cob.activa && cob.montoAsegurado > 0) {
      const nombre = cob.id === 'danios' ? 'Daños y Faltantes' : 'Servicios Públicos (excedente)';
      agregar(nombre, cob.montoAsegurado, TASA_COBERTURAS, false);
    }
  }

  const primaNetaTotal = conceptos.reduce((s, c) => s + c.primaNeta, 0);
  const ivaTotal = conceptos.reduce((s, c) => s + c.iva, 0);
  return {
    conceptos,
    primaNetaTotal,
    ivaTotal,
    total: primaNetaTotal + ivaTotal,
    comision: Math.round(principalPrimaNeta * 0.08),
  };
}

/**
 * Construye los KPIs y listado de referidos (Req 15.4, 15.5).
 * Alinea con `EstadoReferidosResponse`: { total, activos, convertidos, referidos }.
 */
function referidosMock(): unknown {
  return {
    total: 18,
    activos: 5,
    convertidos: 10,
    referidos: [
      { nombre: 'Juan Camilo Ríos', producto: 'Seguro de Hogar', estado: 'Aceptada', fecha: '15 may 2026' },
      { nombre: 'Paula Andrea Gómez', producto: 'Seguro de Carros', estado: 'En proceso', fecha: '10 may 2026' },
      { nombre: 'Fernando Castillo', producto: 'Seguro de Vida', estado: 'Rechazada', fecha: '5 may 2026' },
      { nombre: 'Marcela Duque', producto: 'Seguro de Hogar', estado: 'Aceptada', fecha: '28 abr 2026' },
      { nombre: 'Ricardo Salazar', producto: 'Seguro de Vida', estado: 'Aceptada', fecha: '20 abr 2026' },
    ],
  };
}

/**
 * Normaliza el nombre de un departamento a la clave de cobertura.
 * Quita tildes, pasa a minúsculas y mapea los nombres compuestos conocidos.
 */
function normalizarDepartamento(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (base.startsWith('valle')) {
    return 'valle';
  }
  return base;
}

/**
 * Documentos ya notificados como `desactualizado`: al reconsultarlos se simula
 * que el propietario/apoderado actualizó su SARLAFT con la URL recibida.
 */
const SARLAFT_NOTIFICADOS = new Set<string>();

/**
 * Mock de la API SARLAFT de la radicación (paso 4) con sus 3 salidas.
 * Se consulta a quien firma (propietario o apoderado). El último dígito del
 * documento consultado elige el camino:
 * - termina en 1 (o cualquier otro no listado) → `actualizado`
 * - termina en 2 → `desactualizado`; la reconsulta devuelve `actualizado`
 * - termina en 3 → `consultable` (queda en el Warehouse con radicado)
 */
function resolverSarlaftRadicacion(cuerpo: unknown): unknown {
  const req = (cuerpo ?? {}) as {
    numeroDocumento?: string;
    sujeto?: 'propietario' | 'apoderado';
  };
  const sujeto = req.sujeto ?? 'propietario';
  const documento = (req.numeroDocumento ?? '').trim();
  const ultimo = documento.slice(-1);
  const fechaConsulta = new Date().toISOString();

  if (ultimo === '3') {
    return {
      estado: 'consultable',
      mensaje: `El ${sujeto} aparece como consultable en listas. El caso pasa a revisión de Cumplimiento y los datos quedan en el Warehouse.`,
      fechaConsulta,
      radicado: '#RAD-2026-4522',
    };
  }
  if (ultimo === '2' && !SARLAFT_NOTIFICADOS.has(documento)) {
    SARLAFT_NOTIFICADOS.add(documento);
    return {
      estado: 'desactualizado',
      mensaje: `El SARLAFT del ${sujeto} está desactualizado. Se le envió la URL de actualización.`,
      fechaConsulta,
      enlaceActualizacion: `https://sarlaft.segurosbolivar.com/actualizar?t=${documento.slice(-4)}A9F2`,
      correoDestinatario: sujeto === 'apoderado' ? 'ap*****@correo.com' : 'pr*****@correo.com',
    };
  }
  return {
    estado: 'actualizado',
    mensaje: `SARLAFT del ${sujeto} vigente. Puedes continuar con la carga de documentos.`,
    fechaConsulta,
  };
}

/** Documentos de aspirantes a los que ya se les envió la URL de actualización. */
const SARLAFT_REGISTRO_NOTIFICADOS = new Set<string>();

/**
 * Mock de la verificación SARLAFT del registro de broker (mismas 3 salidas que
 * la radicación). Último dígito del documento: 3 → consultable · 2 →
 * desactualizado (al reconsultar queda actualizado) · otro → actualizado.
 */
function resolverSarlaftRegistro(documento: string, correo: string): unknown {
  const fechaConsulta = new Date().toISOString();
  const doc = documento.trim();
  if (doc.endsWith('3')) {
    return {
      estado: 'consultable',
      mensaje: 'Tu documento aparece como consultable en listas. La solicitud pasa a revisión de Cumplimiento.',
      fechaConsulta,
      radicado: '#REG-2026-0188',
    };
  }
  if (doc.endsWith('2') && !SARLAFT_REGISTRO_NOTIFICADOS.has(doc)) {
    SARLAFT_REGISTRO_NOTIFICADOS.add(doc);
    const [usuario, dominio] = correo.split('@');
    return {
      estado: 'desactualizado',
      mensaje: 'Tu SARLAFT está desactualizado. Te enviamos la URL para actualizarlo.',
      fechaConsulta,
      enlaceActualizacion: `https://sarlaft.segurosbolivar.com/actualizar?t=${doc.slice(-4)}B7C1`,
      correoDestinatario: dominio ? `${(usuario ?? '').slice(0, 2)}*****@${dominio}` : 'tu correo',
    };
  }
  return { estado: 'actualizado', mensaje: 'Tu SARLAFT está vigente. Continúa con tus documentos.', fechaConsulta };
}

/** Estudios aprobados de ejemplo: inquilino (PII enmascarada) + inmueble. */
const ESTUDIOS_MOCK = [
  {
    inquilino: { nombre: 'Camila Restrepo Gómez', cedula: '1.020.•••.050', celular: '+57 3•• ••• 4412', correo: 'c•••@correo.com' },
    inmueble: { direccion: 'Cra 43A # 7-50, apto 1204', ciudad: 'Medellín', destino: 'Vivienda', canon: 2800000, administracion: 350000, propietario: 'Jorge Villegas Arango' },
  },
  {
    inquilino: { nombre: 'Andrés Felipe Ríos', cedula: '80.•••.321', celular: '+57 3•• ••• 9087', correo: 'a•••@empresa.co' },
    inmueble: { direccion: 'Calle 93 # 11-26, local 2', ciudad: 'Bogotá', destino: 'Comercio', canon: 6500000, administracion: 780000, propietario: 'Inversiones Andinas S.A.S.' },
  },
  {
    inquilino: { nombre: 'Valentina Castro Mora', cedula: '1.144.•••.873', celular: '+57 3•• ••• 2250', correo: 'v•••@correo.com' },
    inmueble: { direccion: 'Av. 6N # 23-40, apto 502', ciudad: 'Cali', destino: 'Vivienda', canon: 1900000, administracion: 240000, propietario: 'Martha Lucía Pérez' },
  },
];

/**
 * Mock de la API de Estudio de Arrendamiento (paso 2, API-gate).
 * Último dígito del número de estudio: 9 → `no_aprobado` (URL de Estudio
 * Digital) · 8 → `pendiente` (en proceso) · otro → `aprobado` con los datos del
 * inquilino y del inmueble.
 */
function resolverEstudioRadicacion(cuerpo: unknown): unknown {
  const numeroEstudio = ((cuerpo ?? {}) as { numeroEstudio?: string }).numeroEstudio?.trim().toUpperCase() ?? '';
  const fechaConsulta = new Date().toISOString();
  const ultimo = Number(numeroEstudio.slice(-1));
  if (numeroEstudio.endsWith('9')) {
    return {
      estado: 'no_aprobado',
      numeroEstudio,
      fechaConsulta,
      urlEstudioDigital: `https://estudiodigital.ellibertador.co/estudio?ref=${numeroEstudio.slice(-4)}`,
    };
  }
  if (numeroEstudio.endsWith('8')) {
    return { estado: 'pendiente', numeroEstudio, fechaConsulta };
  }
  const vigencia = new Date();
  vigencia.setDate(vigencia.getDate() + 30);
  const ejemplo = ESTUDIOS_MOCK[(Number.isInteger(ultimo) ? ultimo : 0) % ESTUDIOS_MOCK.length];
  return {
    estado: 'aprobado',
    numeroEstudio,
    fechaConsulta,
    vigenteHasta: vigencia.toISOString().slice(0, 10),
    ...ejemplo,
  };
}

/**
 * Mock de la validación SARLAFT de renovación (2 salidas del proceso real).
 * Pólizas cuyo número termina en dígito impar arrancan con SARLAFT no vigente
 * (más de 36 meses); al reconsultar con el SARLAFT actualizado queda vigente.
 */
function resolverSarlaftRenovacion(cuerpo: unknown): unknown {
  const req = (cuerpo ?? {}) as { numeroPoliza?: string; documentoActualizado?: unknown };
  const ultimo = Number((req.numeroPoliza ?? '').trim().slice(-1));
  const noVigente = !req.documentoActualizado && Number.isInteger(ultimo) && ultimo % 2 === 1;
  const hoy = new Date();
  if (noVigente) {
    const expedicion = new Date(hoy.getFullYear() - 4, hoy.getMonth() - 2, hoy.getDate());
    return {
      estado: 'no_vigente',
      ultimaExpedicion: expedicion.toISOString(),
      tiempoTranscurrido: '4 años, 2 meses',
      mesesDesdeExpedicion: 50,
      validacionId: `VAL-${Date.now()}`,
    };
  }
  const expedicion = req.documentoActualizado
    ? hoy
    : new Date(hoy.getFullYear() - 1, hoy.getMonth() - 3, hoy.getDate());
  return {
    estado: 'vigente',
    ultimaExpedicion: expedicion.toISOString(),
    tiempoTranscurrido: req.documentoActualizado ? 'Expedido hoy' : '1 año, 3 meses',
    mesesDesdeExpedicion: req.documentoActualizado ? 0 : 15,
    validacionId: `VAL-${Date.now()}`,
  };
}

/** Lee un parámetro de una query string. */
function leerParam(query: string, clave: string): string {
  for (const par of query.split('&')) {
    const [k, v] = par.split('=');
    if (k === clave) {
      return decodeURIComponent(v ?? '');
    }
  }
  return '';
}
