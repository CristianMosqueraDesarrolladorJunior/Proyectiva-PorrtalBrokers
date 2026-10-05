/**
 * Lógica PURA del wizard de gestión de renovación (`/app/renovaciones/detalle`),
 * alineada al proceso real de renovaciones (proyecto AutogestionRenovaciones):
 *
 * - Renovación física: formulario → SARLAFT → enviada.
 * - Renovación digital: detalles → ajuste → SARLAFT → en proceso.
 * - Caso especial (Otro Sí / Cesión): documento → SARLAFT → enviado.
 * - No renovar: confirmación → motivo → SARLAFT → recibida.
 * - Corrección de documentos: documento → observaciones → SARLAFT → enviada.
 *
 * TODAS las gestiones validan SARLAFT antes de enviarse. Funciones puras y totales.
 */

/** Gestión elegida en el paso de opciones. */
export type FlujoGestion = 'digital' | 'fisica' | 'caso-especial' | 'no-renovar' | 'correccion';

/** Etapa del wizard. */
export type EtapaGestion =
  | 'opciones'
  | 'detalles'
  | 'ajuste'
  | 'captura'
  | 'observaciones'
  | 'sarlaft'
  | 'exito';

/** Vigencia máxima del certificado SARLAFT para continuar una gestión (meses). */
export const MESES_VIGENCIA_SARLAFT = 36;

/** Etapas por flujo, en orden. */
export const ETAPAS_POR_FLUJO: Readonly<Record<FlujoGestion, readonly EtapaGestion[]>> = {
  digital: ['opciones', 'detalles', 'ajuste', 'sarlaft', 'exito'],
  fisica: ['opciones', 'captura', 'sarlaft', 'exito'],
  'caso-especial': ['opciones', 'captura', 'sarlaft', 'exito'],
  'no-renovar': ['opciones', 'captura', 'sarlaft', 'exito'],
  correccion: ['opciones', 'captura', 'observaciones', 'sarlaft', 'exito'],
};

/** Paso del indicador: etiqueta + descripción corta (forma de `PasoTab`). */
export interface PasoGestion {
  readonly etiqueta: string;
  readonly descripcion: string;
}

const OPCIONES: PasoGestion = { etiqueta: 'Opciones', descripcion: 'Elige la gestión' };
const SARLAFT: PasoGestion = { etiqueta: 'SARLAFT', descripcion: 'Vigencia < 36 meses' };

/** Pasos del indicador por flujo (uno por etapa). */
export const PASOS_POR_FLUJO: Readonly<Record<FlujoGestion, readonly PasoGestion[]>> = {
  digital: [
    OPCIONES,
    { etiqueta: 'Detalles', descripcion: 'Modalidad' },
    { etiqueta: 'Ajuste', descripcion: 'Valores e IPC' },
    SARLAFT,
    { etiqueta: 'En proceso', descripcion: 'Radicado' },
  ],
  fisica: [
    OPCIONES,
    { etiqueta: 'Formulario', descripcion: 'Formato firmado' },
    SARLAFT,
    { etiqueta: 'Enviada', descripcion: 'Radicado' },
  ],
  'caso-especial': [
    OPCIONES,
    { etiqueta: 'Documento', descripcion: 'Otro Sí o Cesión' },
    SARLAFT,
    { etiqueta: 'Enviado', descripcion: 'Radicado' },
  ],
  'no-renovar': [
    OPCIONES,
    { etiqueta: 'Motivo', descripcion: 'Por qué no renueva' },
    SARLAFT,
    { etiqueta: 'Recibida', descripcion: 'Radicado' },
  ],
  correccion: [
    OPCIONES,
    { etiqueta: 'Documento', descripcion: 'Archivo corregido' },
    { etiqueta: 'Observaciones', descripcion: 'Qué cambió' },
    SARLAFT,
    { etiqueta: 'Enviada', descripcion: 'Radicado' },
  ],
};

/** Índice del paso activo del stepper; 0 si la etapa no pertenece al flujo. */
export function indicePaso(flujo: FlujoGestion, etapa: EtapaGestion): number {
  return Math.max(0, ETAPAS_POR_FLUJO[flujo].indexOf(etapa));
}

/** Etapa siguiente del flujo; la última etapa se mantiene. */
export function siguienteEtapa(flujo: FlujoGestion, etapa: EtapaGestion): EtapaGestion {
  const etapas = ETAPAS_POR_FLUJO[flujo];
  const i = etapas.indexOf(etapa);
  return i >= 0 && i < etapas.length - 1 ? etapas[i + 1] : etapa;
}

/** Etapa anterior del flujo; la primera etapa se mantiene. */
export function etapaAnterior(flujo: FlujoGestion, etapa: EtapaGestion): EtapaGestion {
  const etapas = ETAPAS_POR_FLUJO[flujo];
  const i = etapas.indexOf(etapa);
  return i > 0 ? etapas[i - 1] : etapa;
}

/** SARLAFT vigente si tiene menos de 36 meses desde su expedición. */
export function esSarlaftVigente(mesesDesdeExpedicion: number): boolean {
  return mesesDesdeExpedicion >= 0 && mesesDesdeExpedicion < MESES_VIGENCIA_SARLAFT;
}
