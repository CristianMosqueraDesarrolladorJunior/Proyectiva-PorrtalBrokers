/**
 * Lógica PURA de la inducción de una póliza vencida (Apps Script "cuentas" → portal).
 *
 * Una póliza vencida no se renueva: se induce de nuevo con los datos de las 3 partes, el contrato y el
 * paz y salvo. Validación de UX; el backend revalida antes de enviar el correo al área.
 */
import type { ParteInduccion } from '../../core/models/renovacion.model';
import type { LecturaContratoResponse, ParteLeida } from '../../core/models/contrato.model';

export type ClaveParte = 'propietario' | 'inquilino' | 'deudorSolidario';

export const ETIQUETA_PARTE: Readonly<Record<ClaveParte, string>> = {
  propietario: 'Propietario (arrendador)',
  inquilino: 'Inquilino (arrendatario)',
  deudorSolidario: 'Deudor solidario',
};

export const PARTE_VACIA: ParteInduccion = {
  nombre: '',
  tipoIdentificacion: 'CC',
  numeroIdentificacion: '',
  telefono: '',
  correo: '',
};

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Póliza que va a inducción: el backend la clasifica VENCIDA con las reglas del área (VENCIDO en el Warehouse o
 * desde el primer día después del vencimiento sin gestión cerrada). Solo se renueva la que no está vencida.
 */
export function esPolizaVencida(poliza: { estado: string }): boolean {
  return poliza.estado === 'VENCIDA';
}

/** Errores de una parte, prefijados con su etiqueta; vacío si está completa. */
export function revisarParte(clave: ClaveParte, parte: ParteInduccion): string[] {
  const quien = ETIQUETA_PARTE[clave];
  const errores: string[] = [];
  if (parte.nombre.trim().length < 3) errores.push(`${quien}: escribe el nombre completo.`);
  if (!/^[0-9A-Za-z]{5,15}$/.test(parte.numeroIdentificacion.trim())) {
    errores.push(`${quien}: el número de identificación no es válido.`);
  }
  if (!/^\d{7,10}$/.test(parte.telefono.replace(/\D/g, ''))) errores.push(`${quien}: el teléfono no es válido.`);
  if (!CORREO.test(parte.correo.trim())) errores.push(`${quien}: el correo no es válido.`);
  return errores;
}

/** Todo lo que falta para enviar la inducción (lista vacía = se puede enviar). */
export function revisarInduccion(
  partes: Readonly<Record<ClaveParte, ParteInduccion>>,
  conDeudor: boolean,
  hayContrato: boolean,
  hayPazYSalvo: boolean,
): string[] {
  const claves: ClaveParte[] = conDeudor ? ['propietario', 'inquilino', 'deudorSolidario'] : ['propietario', 'inquilino'];
  const errores = claves.flatMap((c) => revisarParte(c, partes[c]));
  if (!hayContrato) errores.push('Carga el contrato de arrendamiento.');
  if (!hayPazYSalvo) errores.push('Carga el paz y salvo del inquilino.');
  return errores;
}

/** Convierte una parte leída del contrato en la parte editable (solo lo que llegó con valor). */
export function parteDesdeLectura(base: ParteInduccion, leida: ParteLeida | undefined): ParteInduccion {
  if (!leida) return base;
  const nombre = [leida.nombres, leida.apellidos].filter((v) => v && v.trim()).join(' ');
  return {
    nombre: nombre || base.nombre,
    tipoIdentificacion: leida.tipoIdentificacion || base.tipoIdentificacion,
    numeroIdentificacion: leida.numeroIdentificacion || base.numeroIdentificacion,
    telefono: leida.telefono || base.telefono,
    correo: leida.correo || base.correo,
  };
}

/** Las 3 partes precargadas con la lectura del contrato. */
export function partesDesdeLectura(
  actuales: Readonly<Record<ClaveParte, ParteInduccion>>,
  lectura: LecturaContratoResponse,
): Record<ClaveParte, ParteInduccion> {
  return {
    propietario: parteDesdeLectura(actuales.propietario, lectura.arrendador),
    inquilino: parteDesdeLectura(actuales.inquilino, lectura.arrendatario),
    deudorSolidario: parteDesdeLectura(actuales.deudorSolidario, lectura.deudorSolidario),
  };
}
