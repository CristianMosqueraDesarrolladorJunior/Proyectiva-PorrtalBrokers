/**
 * Reglas del canon en una renovación (porte fiel de `cuentas/reglas`).
 *
 * En vivienda el canon sube como máximo el IPC del año anterior sin un «otro sí»; en comercio no hay
 * tope. Nunca baja. Previsualización: el backend revalida con el IPC vigente de `parametro_negocio`.
 */
import { conPuntos } from './numeros-letras';


export type DestinoInmueble = 'vivienda' | 'comercio';

/** Canon máximo sin otro sí; `null` si no hay tope (comercio). */
export function topeDeCanon(canonActual: number, destino: DestinoInmueble, ipc: number): number | null {
  if (destino === 'comercio') return null;
  return Math.trunc(canonActual * (1 + ipc / 100));
}

/** `error` bloquea la renovación; `aviso` exige un otro sí firmado. */
export function revisarIncremento(
  canonActual: number,
  canonNuevo: number,
  destino: DestinoInmueble,
  ipc: number,
  anioIpc: number,
): { error: string; aviso: string } {
  if (!(canonNuevo > 0)) return { error: 'Escribe el canon con el que queda la póliza.', aviso: '' };
  if (canonNuevo < canonActual) {
    return {
      error:
        'El canon no puede quedar por debajo del que tiene la póliza: venía en ' +
        `${conPuntos(canonActual)} y escribiste ${conPuntos(canonNuevo)}.`,
      aviso: '',
    };
  }
  const tope = topeDeCanon(canonActual, destino, ipc);
  if (tope === null || canonNuevo <= tope) return { error: '', aviso: '' };
  const subida = canonActual ? (canonNuevo / canonActual - 1) * 100 : 0;
  return {
    error: '',
    aviso:
      `Este incremento necesita un «otro sí». Estás subiendo el canon un ${subida.toFixed(1)} % ` +
      `—de ${conPuntos(canonActual)} a ${conPuntos(canonNuevo)}— y en vivienda el tope sin acuerdo es el ` +
      `${ipc.toFixed(2)} % del IPC de ${anioIpc - 1}, o sea ${conPuntos(tope)}. Para subir más hace falta un ` +
      'otro sí firmado por el propietario y el inquilino; sin él, Bolívar devuelve la renovación.',
  };
}
