/** Claves triviales que el backend rechaza (auditoría S2); sin reglas de complejidad por decisión de operación. */
const TRIVIALES = new Set(['password', 'password1', 'contraseña', 'contrasena', 'qwertyui', 'qwerty123', '12345678',
  '123456789', '1234567890', '11111111', 'proyectiva', 'segurosbolivar', 'libertador', 'colombia']);

/** Misma política que el backend: 8 a 128 caracteres, no trivial y distinta a la cédula. */
export function esClaveSegura(clave: string, cedula?: string): boolean {
  if (clave.trim().length === 0 || clave.length < 8 || clave.length > 128) return false;
  const c = clave.toLowerCase();
  const trivial = new Set(c).size === 1 || TRIVIALES.has(c) || '0123456789'.includes(c) || '9876543210'.includes(c)
    || 'abcdefghijklmnopqrstuvwxyz'.includes(c);
  return !trivial && (!cedula || clave.replace(/\s/g, '') !== cedula.replace(/\s/g, ''));
}

export const MENSAJE_CLAVE = 'Usa mínimo 8 caracteres; no uses tu cédula, letras o números repetidos ni claves comunes.';
