import { IntentUi } from '../../core/models/agente.model';

/**
 * Helpers PUROS del lienzo del Agente IA (diagrama 10, "Contrato de intents UI").
 *
 * El lienzo solo pinta intents de una lista cerrada y valida cada uno antes de
 * renderizarlo: tipos desconocidos, rutas fuera de `/app` o URLs externas se
 * descartan. Nunca se usa `[innerHTML]`.
 */

/** Rutas de `/app` a las que el agente puede sugerir navegar. */
export const RUTAS_PERMITIDAS: ReadonlySet<string> = new Set([
  'seguimiento',
  'radicacion',
  'referidos',
  'estado-referidos',
  'cotizador',
  'renovaciones',
  'documentos',
  'calendario',
  'ayuda',
]);

/** Prefijo de las URLs firmadas que entrega el backend. */
const PREFIJO_DOCUMENTOS = '/api/v1/documentos/firmados/';

const TONOS = new Set(['info', 'success', 'warning', 'danger']);
const FLUJOS = new Set(['radicacion', 'referido', 'renovacion', 'cotizacion']);
const TARJETAS = new Set(['cotizacion', 'sarlaft', 'documentos', 'solicitudes', 'exito']);

function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 500;
}

function sonCampos(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.length <= 20 &&
    v.every((c) => typeof c === 'object' && c !== null && esTexto((c as Record<string, unknown>)['etiqueta']) && esTexto((c as Record<string, unknown>)['valor']))
  );
}

/**
 * Valida un intent recibido del BFF contra la lista cerrada.
 *
 * @returns el intent tipado si es válido, o `null` si debe descartarse.
 */
export function validarIntent(bruto: unknown): IntentUi | null {
  if (typeof bruto !== 'object' || bruto === null) {
    return null;
  }
  const i = bruto as Record<string, unknown>;
  switch (i['tipo']) {
    case 'llenar':
      return FLUJOS.has(i['flujo'] as string) && sonCampos(i['campos']) ? (bruto as IntentUi) : null;
    case 'mostrar': {
      const docsOk =
        i['documentos'] === undefined ||
        (Array.isArray(i['documentos']) &&
          i['documentos'].every(
            (d) => typeof d === 'object' && d !== null && esTexto((d as Record<string, unknown>)['etiqueta']) && typeof (d as Record<string, unknown>)['ok'] === 'boolean',
          ));
      return TARJETAS.has(i['tarjeta'] as string) && TONOS.has(i['tono'] as string) && esTexto(i['titulo']) && sonCampos(i['campos']) && docsOk
        ? (bruto as IntentUi)
        : null;
    }
    case 'solicitar_archivos':
      return esTexto(i['titulo']) &&
        Array.isArray(i['reglas']) &&
        i['reglas'].length > 0 &&
        i['reglas'].every((r) => typeof r === 'object' && r !== null && esTexto((r as Record<string, unknown>)['id']) && esTexto((r as Record<string, unknown>)['etiqueta']))
        ? (bruto as IntentUi)
        : null;
    case 'entregar_documento':
      return esTexto(i['nombre']) && esTexto(i['url']) && (i['url'] as string).startsWith(PREFIJO_DOCUMENTOS) && !(i['url'] as string).includes('..')
        ? (bruto as IntentUi)
        : null;
    case 'confirmar':
      return esTexto(i['accion']) && esTexto(i['endpoint']) && sonCampos(i['resumen']) ? (bruto as IntentUi) : null;
    case 'navegar':
      return RUTAS_PERMITIDAS.has(i['ruta'] as string) && esTexto(i['etiqueta']) ? (bruto as IntentUi) : null;
    default:
      return null;
  }
}

/** Valida una lista de intents y descarta los inválidos. */
export function filtrarIntents(brutos: readonly unknown[]): IntentUi[] {
  return brutos.map(validarIntent).filter((i): i is IntentUi => i !== null);
}

/** Identificador de hilo nuevo (thread_id del checkpointer). */
export function nuevoHiloId(): string {
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `hilo-${aleatorio}`;
}
