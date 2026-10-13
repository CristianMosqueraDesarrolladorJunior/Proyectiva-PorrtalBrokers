/**
 * Lógica PURA de validación de documentos cargados (registro y radicación).
 *
 * Ubicación: `shared/validation` — es lógica de presentación reutilizable, sin
 * dependencias de Angular ni de `HttpClient`, consumida por `DocUploaderComponent`
 * y por los formularios de registro/radicación. El backend SIEMPRE revalida
 * (Req 3.23, 10.5, 13.5); esta validación es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen la fecha del
 * sistema ni ningún estado externo. La "fecha de hoy" para el cálculo de vigencia
 * se recibe SIEMPRE como parámetro explícito, de modo que el resultado es
 * reproducible (preparado para PBT — Property 4).
 *
 * Alinea con:
 * - Property 4 (design.md): un archivo se acepta si y solo si su MIME y extensión
 *   pertenecen al conjunto permitido, su tamaño no supera el límite del documento
 *   (5 MB Autorización de Pago; 10 MB general) y su vigencia cumple el umbral
 *   aplicable (Certificación Bancaria ≤ 30 días; Certificado de Tradición ≤ 90 días;
 *   Certificado de existencia ≤ 30 días). El conjunto obligatorio de registro es
 *   exactamente los 4 documentos definidos.
 * - Requirements: 3.16, 3.17, 3.18, 13.1, 13.2, 13.3, 13.4.
 */

import type { DocumentoCargado, TipoMimePermitido } from '../../core/models/documento.model';
import { MIMES_DOCUMENTO, type ReglaDocumentoRegistro } from '../../core/models/registro-broker.model';

/** Límite general de tamaño de un documento: 10 MB (Req 13.2). */
export const LIMITE_TAMANO_GENERAL_BYTES = 10_485_760;


/** Motivos tipados por los que un documento puede rechazarse (Property 4). */
export type MotivoRechazoDocumento =
  | 'mime_no_permitido'
  | 'extension_no_permitida'
  | 'tamano_excedido'
  | 'vigencia_requerida'
  | 'vigencia_invalida'
  | 'vigencia_excedida';

/** Resultado tipado de la validación de un documento (Property 4). */
export interface ResultadoValidacionDocumento {
  readonly valido: boolean;
  /** Presente solo cuando `valido === false`; indica la causa del rechazo. */
  readonly motivo?: MotivoRechazoDocumento;
}

/**
 * Regla de validación aplicable a un documento cargado (registro o radicación).
 * Es la forma unificada que consume `validarDocumento`. Las reglas concretas de
 * registro provienen de `DOCUMENTOS_REGISTRO_BROKER` y las de radicación de
 * `REGLAS_DOCUMENTO_RADICACION`.
 */
export interface ReglaValidacionDocumento {
  /** Conjunto de tipos MIME permitidos (PDF, o PDF/JPG/PNG donde aplique) (Req 3.17, 13.1). */
  readonly mimePermitidos: readonly TipoMimePermitido[];
  /** Tamaño máximo permitido en bytes (5 MB Autorización de Pago; 10 MB general) (Req 3.18, 13.2). */
  readonly tamanoMaxBytes: number;
  /** Vigencia máxima en días; `null` cuando el documento no exige vigencia (Req 3.16, 13.3, 13.4). */
  readonly vigenciaMaxDias: number | null;
}

/**
 * Extensiones de archivo permitidas por cada tipo MIME (Req 3.17, 13.1).
 * La validación exige coincidencia de MIME Y de extensión.
 */
const EXTENSIONES_POR_MIME: Readonly<Record<TipoMimePermitido, readonly string[]>> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

/**
 * Regla de carga de un documento a partir de su fila de catálogo (`documento_radicacion`):
 * `tamano_max_bytes` y `vigencia_max_dias` vienen de la BD. El backend revalida (Req 13.5).
 */
export function reglaDesdeCatalogo(fila: { readonly [columna: string]: unknown } | undefined): ReglaValidacionDocumento {
  const tamano = Number(fila?.['tamano_max_bytes']);
  const vigencia = fila?.['vigencia_max_dias'];
  return {
    mimePermitidos: MIMES_DOCUMENTO,
    tamanoMaxBytes: Number.isFinite(tamano) && tamano > 0 ? tamano : LIMITE_TAMANO_GENERAL_BYTES,
    vigenciaMaxDias: vigencia == null ? null : Number(vigencia),
  };
}

/**
 * Extrae la extensión (en minúsculas, sin punto) del nombre de archivo.
 * Devuelve cadena vacía si el nombre no tiene extensión reconocible.
 * Función pura y total.
 */
function extraerExtension(nombre: string): string {
  const indicePunto = nombre.lastIndexOf('.');
  if (indicePunto < 0 || indicePunto === nombre.length - 1) {
    return '';
  }
  return nombre.slice(indicePunto + 1).toLowerCase();
}

/**
 * Indica si la extensión del archivo corresponde a su tipo MIME declarado y
 * ambos pertenecen al conjunto permitido de la regla (Req 3.17, 13.1).
 * Función pura y total.
 */
function extensionCoincideConMime(nombre: string, tipoMime: TipoMimePermitido): boolean {
  const extension = extraerExtension(nombre);
  const extensionesValidas = EXTENSIONES_POR_MIME[tipoMime];
  return extensionesValidas.includes(extension);
}

/**
 * Calcula los días transcurridos entre la fecha de emisión y la fecha de referencia
 * ("hoy"), truncando al día calendario en UTC. Devuelve `null` si alguna fecha no
 * es válida o si la emisión es futura respecto a la referencia.
 * Función pura y total: `hoy` se recibe como parámetro; no se lee el reloj del sistema.
 */
function diasDeVigencia(fechaEmisionIso: string, hoyIso: string): number | null {
  const emision = Date.parse(fechaEmisionIso);
  const hoy = Date.parse(hoyIso);
  if (Number.isNaN(emision) || Number.isNaN(hoy)) {
    return null;
  }
  const msPorDia = 86_400_000;
  const diasEmision = Math.floor(emision / msPorDia);
  const diasHoy = Math.floor(hoy / msPorDia);
  const diferencia = diasHoy - diasEmision;
  if (diferencia < 0) {
    return null;
  }
  return diferencia;
}

/**
 * Valida un documento cargado contra su regla (registro o radicación).
 *
 * Acepta el archivo si y solo si (Property 4):
 * - su tipo MIME pertenece al conjunto permitido de la regla, Y
 * - la extensión del nombre corresponde a ese tipo MIME, Y
 * - su tamaño no supera el límite del documento, Y
 * - si la regla exige vigencia, la fecha de emisión existe, es válida y los días
 *   transcurridos respecto a `hoy` no superan el umbral aplicable.
 * En cualquier otro caso lo rechaza indicando el motivo tipado.
 *
 * Función pura, total y determinista.
 *
 * @param archivo Documento cargado (nombre, tipo MIME, tamaño y fecha de emisión opcional).
 * @param regla Regla de validación aplicable al documento.
 * @param hoyIso Fecha de referencia ISO-8601 usada para el cálculo de vigencia.
 * @returns Resultado tipado con `valido` y, si se rechaza, el `motivo`.
 */
export function validarDocumento(
  archivo: DocumentoCargado,
  regla: ReglaValidacionDocumento,
  hoyIso: string,
): ResultadoValidacionDocumento {
  if (!regla.mimePermitidos.includes(archivo.tipoMime)) {
    return { valido: false, motivo: 'mime_no_permitido' };
  }
  if (!extensionCoincideConMime(archivo.nombre, archivo.tipoMime)) {
    return { valido: false, motivo: 'extension_no_permitida' };
  }
  if (archivo.tamanoBytes > regla.tamanoMaxBytes) {
    return { valido: false, motivo: 'tamano_excedido' };
  }
  if (regla.vigenciaMaxDias !== null) {
    if (archivo.fechaEmision === undefined) {
      return { valido: false, motivo: 'vigencia_requerida' };
    }
    const dias = diasDeVigencia(archivo.fechaEmision, hoyIso);
    if (dias === null) {
      return { valido: false, motivo: 'vigencia_invalida' };
    }
    if (dias > regla.vigenciaMaxDias) {
      return { valido: false, motivo: 'vigencia_excedida' };
    }
  }
  return { valido: true };
}

/**
 * Adapta una `ReglaDocumentoRegistro` (de `documentosRegistroBroker`, catálogo de BD)
 * a la forma unificada `ReglaValidacionDocumento` que consume `validarDocumento`.
 * Función pura.
 */
export function reglaDeDocumentoRegistro(
  regla: ReglaDocumentoRegistro,
): ReglaValidacionDocumento {
  return {
    mimePermitidos: regla.mimePermitidos,
    tamanoMaxBytes: regla.tamanoMaxBytes,
    vigenciaMaxDias: regla.vigenciaMaxDias,
  };
}

