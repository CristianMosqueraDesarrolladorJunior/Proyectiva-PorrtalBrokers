import type { SeccionFicha } from '../../shared/components/ficha/ficha.component';

/** Registro completo de la póliza en el Warehouse de renovaciones (hoja JSON), tal como lo sincroniza el portal. */
export type DatosRenovacion = Readonly<Record<string, unknown>>;

/** Campos del JSON agrupados y con su nombre en lenguaje del negocio. Lo que no esté aquí va a «Otros datos». */
const GRUPOS: readonly { titulo: string; icono: string; campos: readonly (readonly [string, string])[] }[] = [
  {
    titulo: 'Detalle de la póliza', icono: 'policy', campos: [
      ['poliza', 'Número de póliza'], ['solicitud', 'Solicitud'], ['segmento', 'Segmento'], ['vigencia', 'Inicio de vigencia'],
      ['vencimiento', 'Vencimiento'], ['mesVencimientoPoliza', 'Mes de vencimiento'], ['destinoInmueble', 'Destino del inmueble'],
      ['direccionRiesgo', 'Dirección del riesgo'],
    ],
  },
  {
    titulo: 'Contacto del asegurado', icono: 'person', campos: [
      ['asegurado', 'Nombre'], ['tipoDocumento', 'Tipo de documento'], ['documento', 'Documento'], ['celular', 'Celular'],
      ['telefono1', 'Teléfono'], ['email', 'Correo'],
    ],
  },
  {
    titulo: 'Valores y pagos', icono: 'payments', campos: [
      ['canon', 'Canon'], ['admon', 'Administración'], ['valorAsegSep', 'Valor asegurado servicios públicos'],
      ['valorAsegDyf', 'Valor asegurado daños y faltantes'], ['costo', 'Costo de la póliza'], ['valorPagado', 'Valor pagado'],
      ['fechaDePago', 'Fecha de pago'], ['observacionPagos', 'Observación de pagos'],
    ],
  },
  {
    titulo: 'Renovación y Conocimiento de Cliente', icono: 'autorenew', campos: [
      ['polizaRenovacion', 'Póliza de la renovación'], ['vigenciaNPoliza', 'Inicio de la nueva vigencia'],
      ['vencimientoNPoliza', 'Vencimiento de la nueva póliza'], ['nuevoCanon', 'Nuevo canon'],
      ['nuevoValorAsegurado', 'Nuevo valor asegurado'], ['motivoNoRenovacion', 'Motivo de no renovación'],
      ['sarlaft', 'Conocimiento de Cliente'], ['fechaUltimoSarlaft', 'Último Conocimiento de Cliente'],
      ['renovarSarlaft', 'Renovar Conocimiento de Cliente'],
    ],
  },
  {
    titulo: 'Broker de la póliza', icono: 'handshake', campos: [
      ['nombreBrIn', 'Broker'], ['emailBrIn', 'Correo de contacto'],
    ],
  },
];

// Documento y código del broker no se muestran: la ficha deja su nombre y su correo de contacto.
const OCULTOS = new Set(['id', 'numBrIn', 'idBrIn']);

/** «valorAsegSep» → «Valor aseg sep» para un campo nuevo que aún no tenga nombre. */
function etiquetaDe(clave: string): string {
  const t = clave.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Campos en pesos: se muestran con formato de moneda. */
const MONEDA = new Set(['canon', 'admon', 'valorAsegSep', 'valorAsegDyf', 'costo', 'valorPagado', 'nuevoCanon', 'nuevoValorAsegurado']);
const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** Valor legible: pesos en los campos de dinero, fechas AAAA-MM-DD como fecha, números sin «.0» de la hoja. */
function texto(clave: string, valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = typeof valor === 'object' ? JSON.stringify(valor) : String(valor).trim();
  if (t === '' || t.toLowerCase() === 'nan' || t === 'None' || t === 'null') return null;
  const numero = Number(t);
  if (MONEDA.has(clave) && t !== '' && Number.isFinite(numero)) return PESOS.format(numero);
  const fecha = /^(\d{4})-(\d{2})-(\d{2})(?:[ T]00:00(?::00)?(?:\.0+)?Z?)?$/.exec(t);
  if (fecha) return new Date(+fecha[1], +fecha[2] - 1, +fecha[3]).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  if (/^-?\d+\.0+$/.test(t)) return t.replace(/\.0+$/, '');
  // La hoja trae el mes en inglés («January/2026»).
  return t.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
    (m) => MESES[m] ?? m);
}

const MESES: Readonly<Record<string, string>> = {
  January: 'Enero', February: 'Febrero', March: 'Marzo', April: 'Abril', May: 'Mayo', June: 'Junio', July: 'Julio',
  August: 'Agosto', September: 'Septiembre', October: 'Octubre', November: 'Noviembre', December: 'Diciembre',
};

/** Secciones de la ficha con TODOS los datos del JSON del Warehouse; los campos vacíos no se muestran. */
export function seccionesDatosRenovacion(datos: DatosRenovacion | null): readonly SeccionFicha[] {
  if (!datos) return [];
  const usados = new Set<string>(OCULTOS);
  const secciones: SeccionFicha[] = [];
  for (const g of GRUPOS) {
    const filas = g.campos
      .map(([clave, etiqueta]) => {
        usados.add(clave);
        const valor = texto(clave, datos[clave]);
        return valor ? { etiqueta, valor, ancho: valor.length > 40 } : null;
      })
      .filter((d): d is { etiqueta: string; valor: string; ancho: boolean } => d !== null);
    if (filas.length) secciones.push({ titulo: g.titulo, icono: g.icono, datos: filas });
  }
  const otros = Object.keys(datos)
    .filter((k) => !usados.has(k))
    .map((k) => ({ etiqueta: etiquetaDe(k), valor: texto(k, datos[k]) }))
    .filter((d): d is { etiqueta: string; valor: string } => d.valor !== null);
  if (otros.length) secciones.push({ titulo: 'Otros datos', icono: 'data_object', datos: otros });
  return secciones;
}
