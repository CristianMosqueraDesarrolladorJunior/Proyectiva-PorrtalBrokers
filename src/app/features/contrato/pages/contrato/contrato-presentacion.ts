/**
 * Lógica PURA de presentación del Generador_Contrato de Arrendamiento (Req 30).
 *
 * Ubicación: junto a la página del Generador_Contrato del feature `contrato`. Es
 * lógica de presentación reutilizable, sin dependencias de Angular ni de
 * `HttpClient`, consumida por `ContratoComponent` y por la prueba de propiedad
 * (Property 22, tarea 11.2). El backend SIEMPRE revalida tipo, formato y presencia
 * de cada campo antes de generar el contrato (Req 30.9); esta lógica es únicamente
 * por UX/fail-fast y NO es autoritativa.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo,
 * de modo que el resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 22 (design.md):
 *   Para todo paso del Generador_Contrato y su estado de validez, la acción
 *   "avanzar" está permitida si y solo si los campos obligatorios de ese paso son
 *   válidos; "Cancelar" retorna a la sección Radicación sin generar el
 *   Contrato_Arrendamiento.
 *
 * _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7, 30.8_
 */

import type {
  CondicionesEconomicas,
  DatosArrendador,
  DatosArrendatario,
  DatosInmueble,
  DuracionContratoMeses,
} from '../../../../core/models/contrato.model';

/** Índice del primer paso del Generador_Contrato (0-indexado). */
export const PRIMER_PASO = 0;

/** Índice del último paso del Generador_Contrato (0-indexado): condiciones económicas. */
export const ULTIMO_PASO = 3;

/** Número total de pasos del formulario multipaso (Req 30.1). */
export const TOTAL_PASOS = 4;

/** Etiquetas de los pasos del Generador_Contrato en orden (Req 30.1). */
export const PASOS_CONTRATO: readonly string[] = [
  'Datos del arrendador',
  'Datos del arrendatario',
  'Datos del inmueble',
  'Condiciones económicas',
];

/** Duraciones del contrato ofrecidas en meses (Req 30.5). */
export const DURACIONES_CONTRATO: readonly DuracionContratoMeses[] = [12, 24, 36];

/** Día de pago mensual mínimo permitido (Req 30.5). */
export const DIA_PAGO_MIN = 1;

/** Día de pago mensual máximo permitido (Req 30.5). */
export const DIA_PAGO_MAX = 31;

/** Estrato mínimo válido para el inmueble (Req 30.4). */
export const ESTRATO_MIN = 1;

/** Estrato máximo válido para el inmueble (Req 30.4). */
export const ESTRATO_MAX = 6;

/** Patrón de formato de correo electrónico usado por la validación de cliente. */
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Patrón de teléfono: solo dígitos, entre 7 y 10 caracteres. */
const PATRON_TELEFONO = /^\d{7,10}$/;

/** Patrón de número de identificación: solo dígitos, entre 6 y 12 caracteres. */
const PATRON_IDENTIFICACION = /^\d{6,12}$/;

/**
 * Indica si un campo de texto está diligenciado.
 * Verdadero si y solo si contiene al menos un carácter no vacío tras recortar
 * espacios. Función pura y total.
 */
export function campoDiligenciado(valor: string | undefined | null): boolean {
  return typeof valor === 'string' && valor.trim().length > 0;
}

/** Indica si un correo tiene formato válido y no está vacío. Función pura y total. */
export function esCorreoValido(correo: string | undefined | null): boolean {
  return typeof correo === 'string' && PATRON_CORREO.test(correo.trim());
}

/** Indica si un teléfono contiene entre 7 y 10 dígitos. Función pura y total. */
export function esTelefonoValido(telefono: string | undefined | null): boolean {
  return typeof telefono === 'string' && PATRON_TELEFONO.test(telefono.trim());
}

/**
 * Indica si un número de identificación contiene entre 6 y 12 dígitos.
 * Función pura y total.
 */
export function esIdentificacionValida(numero: string | undefined | null): boolean {
  return typeof numero === 'string' && PATRON_IDENTIFICACION.test(numero.trim());
}

/**
 * Valida los campos obligatorios del paso 1 — Datos del arrendador (Req 30.2, 30.6).
 * Función pura y total.
 *
 * @param datos datos parciales del arrendador capturados en el formulario.
 * @returns `true` si todos los campos obligatorios del paso son válidos.
 */
export function esPasoArrendadorValido(datos: Partial<DatosArrendador>): boolean {
  return (
    campoDiligenciado(datos.nombres) &&
    campoDiligenciado(datos.apellidos) &&
    campoDiligenciado(datos.tipoIdentificacion) &&
    esIdentificacionValida(datos.numeroIdentificacion) &&
    esTelefonoValido(datos.telefono) &&
    esCorreoValido(datos.correo) &&
    campoDiligenciado(datos.direccionResidencia)
  );
}

/**
 * Valida los campos obligatorios del paso 2 — Datos del arrendatario (Req 30.3, 30.6).
 * Función pura y total.
 *
 * @param datos datos parciales del arrendatario capturados en el formulario.
 * @returns `true` si todos los campos obligatorios del paso son válidos.
 */
export function esPasoArrendatarioValido(datos: Partial<DatosArrendatario>): boolean {
  return (
    campoDiligenciado(datos.nombres) &&
    campoDiligenciado(datos.apellidos) &&
    campoDiligenciado(datos.tipoIdentificacion) &&
    esIdentificacionValida(datos.numeroIdentificacion) &&
    esTelefonoValido(datos.telefono) &&
    esCorreoValido(datos.correo) &&
    campoDiligenciado(datos.ocupacion)
  );
}

/**
 * Valida los campos obligatorios del paso 3 — Datos del inmueble (Req 30.4, 30.6).
 * Función pura y total.
 *
 * @param datos datos parciales del inmueble capturados en el formulario.
 * @returns `true` si todos los campos obligatorios del paso son válidos.
 */
export function esPasoInmuebleValido(datos: Partial<DatosInmueble>): boolean {
  return (
    campoDiligenciado(datos.tipoInmueble) &&
    campoDiligenciado(datos.uso) &&
    campoDiligenciado(datos.direccionCompleta) &&
    campoDiligenciado(datos.ciudad) &&
    campoDiligenciado(datos.matriculaInmobiliaria) &&
    esEnteroEnRango(datos.estrato, ESTRATO_MIN, ESTRATO_MAX) &&
    esNumeroPositivo(datos.areaMetrosCuadrados)
  );
}

/**
 * Valida los campos obligatorios del paso 4 — Condiciones económicas (Req 30.5, 30.6).
 * La cuota de administración es obligatoria pero admite $0; los servicios y los
 * deudores solidarios son opcionales. Función pura y total.
 *
 * @param datos condiciones económicas parciales capturadas en el formulario.
 * @returns `true` si todos los campos obligatorios del paso son válidos.
 */
export function esPasoCondicionesValido(datos: Partial<CondicionesEconomicas>): boolean {
  return (
    esNumeroPositivo(datos.canonMensual) &&
    esNumeroNoNegativo(datos.cuotaAdministracion) &&
    esDuracionValida(datos.duracionMeses) &&
    esEnteroEnRango(datos.diaPagoMensual, DIA_PAGO_MIN, DIA_PAGO_MAX) &&
    campoDiligenciado(datos.fechaInicio) &&
    campoDiligenciado(datos.reajusteAnual)
  );
}

/** Estado agregado de los datos capturados por paso del Generador_Contrato. */
export interface EstadoContrato {
  readonly arrendador: Partial<DatosArrendador>;
  readonly arrendatario: Partial<DatosArrendatario>;
  readonly inmueble: Partial<DatosInmueble>;
  readonly condiciones: Partial<CondicionesEconomicas>;
}

/**
 * Indica si un paso concreto del Generador_Contrato es válido (Req 30.6).
 * Función pura y total; los índices fuera de rango se consideran inválidos.
 *
 * @param paso índice del paso (0-indexado).
 * @param estado datos capturados por paso.
 * @returns `true` si los campos obligatorios del paso indicado son válidos.
 */
export function esPasoValido(paso: number, estado: EstadoContrato): boolean {
  switch (paso) {
    case 0:
      return esPasoArrendadorValido(estado.arrendador);
    case 1:
      return esPasoArrendatarioValido(estado.arrendatario);
    case 2:
      return esPasoInmuebleValido(estado.inmueble);
    case 3:
      return esPasoCondicionesValido(estado.condiciones);
    default:
      return false;
  }
}

/**
 * Gating de avance del Generador_Contrato (Property 22, Req 30.6).
 *
 * La acción "avanzar" está permitida si y solo si el paso actual no es el último
 * y los campos obligatorios de ese paso son válidos. Función pura y total.
 *
 * @param paso índice del paso actual (0-indexado).
 * @param estado datos capturados por paso.
 * @returns `true` si se permite avanzar al siguiente paso.
 */
export function puedeAvanzar(paso: number, estado: EstadoContrato): boolean {
  if (paso < PRIMER_PASO || paso >= ULTIMO_PASO) {
    return false;
  }
  return esPasoValido(paso, estado);
}

/**
 * Indica si se permite retroceder al paso anterior (Req 30.1).
 * Función pura y total: solo depende de no estar en el primer paso.
 */
export function puedeRetroceder(paso: number): boolean {
  return paso > PRIMER_PASO;
}

/**
 * Habilitación de "Generar contrato" (Req 30.7).
 *
 * Está permitida si y solo si TODOS los pasos son válidos, de modo que el
 * `ContratoArrendamientoRequest` esté completo antes de solicitarlo al backend.
 * Función pura y total.
 *
 * @param estado datos capturados por paso.
 * @returns `true` si el contrato puede generarse.
 */
export function puedeGenerar(estado: EstadoContrato): boolean {
  return (
    esPasoArrendadorValido(estado.arrendador) &&
    esPasoArrendatarioValido(estado.arrendatario) &&
    esPasoInmuebleValido(estado.inmueble) &&
    esPasoCondicionesValido(estado.condiciones)
  );
}

// --- Utilidades numéricas puras -------------------------------------------------

/** Verdadero si el valor es un número finito estrictamente positivo. */
function esNumeroPositivo(valor: number | undefined | null): boolean {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

/** Verdadero si el valor es un número finito mayor o igual a cero. */
function esNumeroNoNegativo(valor: number | undefined | null): boolean {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
}

/** Verdadero si el valor es un entero dentro del rango inclusivo [min, max]. */
function esEnteroEnRango(
  valor: number | undefined | null,
  min: number,
  max: number,
): boolean {
  return (
    typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor >= min &&
    valor <= max
  );
}

/** Verdadero si la duración pertenece al conjunto permitido (12, 24 o 36). */
function esDuracionValida(
  valor: DuracionContratoMeses | undefined | null,
): valor is DuracionContratoMeses {
  return valor === 12 || valor === 24 || valor === 36;
}
