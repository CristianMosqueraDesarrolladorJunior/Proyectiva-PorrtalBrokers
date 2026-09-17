/**
 * Helpers PUROS del Chat_Asistente (Req 38).
 *
 * Funciones deterministas y sin efectos secundarios, preparadas para pruebas
 * basadas en propiedades (Properties 23–27). No dependen de Angular ni del DOM:
 *
 * - `alternarVisibilidad`  → Property 23 (conmutación de visibilidad).
 * - `agregarMensaje`       → Property 24 (historial preserva el orden).
 * - `puedeEnviarConsulta`  → Property 25 (bloqueo de envío vacío/solo espacios).
 * - `redactarPii`          → Property 26 (redacción de PII antes de enviar).
 * - `escaparHtml`          → Property 27 (escape/sanitización antes de renderizar).
 *
 * La PII se redacta antes de invocar el Servicio_Asistente (Req 38.15) y el
 * contenido del bot se escapa antes de renderizarse (Req 38.16) para prevenir XSS.
 */

import { MensajeChat } from '../../../core/models/asistente.model';

/** Marcador con el que se reemplaza cualquier patrón de PII detectado (Req 38.15). */
export const MARCADOR_PII = '[dato omitido]';

/**
 * Alterna el estado de visibilidad de la ventana del chat (Req 38.2, 38.3).
 *
 * Función total y determinista: dado el estado actual retorna su negación, de
 * modo que el chat nunca queda visible y oculto a la vez (Property 23).
 *
 * @param visibleActual estado de visibilidad actual de la ventana del chat.
 * @returns el estado de visibilidad opuesto.
 */
export function alternarVisibilidad(visibleActual: boolean): boolean {
  return !visibleActual;
}

/**
 * Agrega un Mensaje_Chat al final del historial preservando el orden (Req 38.5–38.8).
 *
 * No muta el historial recibido: retorna una nueva lista igual a la previa
 * seguida del mensaje nuevo. Ningún mensaje previo se pierde ni se reordena
 * (Property 24).
 *
 * @param historial historial de mensajes previo (inmutable).
 * @param mensaje mensaje a agregar al final.
 * @returns un nuevo historial con el mensaje agregado al final.
 */
export function agregarMensaje(
  historial: readonly MensajeChat[],
  mensaje: MensajeChat,
): readonly MensajeChat[] {
  return [...historial, mensaje];
}

/**
 * Determina si una consulta puede enviarse (Req 38.11).
 *
 * Bloquea el envío de cadenas vacías o compuestas únicamente por espacios en
 * blanco; permite el envío si existe al menos un carácter no-espacio (Property 25).
 *
 * @param texto contenido del campo de entrada (chat-input).
 * @returns `true` si el texto contiene al menos un carácter no-espacio.
 */
export function puedeEnviarConsulta(texto: string): boolean {
  return texto.trim().length > 0;
}

/** Patrones de PII redactados antes de enviar la consulta al Asistente_IA (Req 38.15). */
const PATRONES_PII: readonly RegExp[] = [
  // Correo electrónico.
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // Teléfono/celular: bloques de 7 a 15 dígitos, con separadores opcionales y prefijo internacional.
  /(?:\+?\d[\s-]?){7,15}/g,
  // Número de documento (cédula): secuencias de 6 a 12 dígitos.
  /\b\d{6,12}\b/g,
];

/**
 * Redacta la PII y los secretos de una consulta antes de enviarla al
 * Servicio_Asistente (Req 38.15).
 *
 * Reemplaza correos electrónicos, teléfonos/celulares y números de documento por
 * un marcador, de modo que esos patrones no aparecen en claro en la salida
 * (Property 26). Función pura: no muta la entrada.
 *
 * @param texto consulta original del Broker.
 * @returns la consulta con la PII reemplazada por `MARCADOR_PII`.
 */
export function redactarPii(texto: string): string {
  return PATRONES_PII.reduce(
    (acumulado, patron) => acumulado.replace(patron, MARCADOR_PII),
    texto,
  );
}

/** Reemplazos de escape de caracteres sensibles a HTML (Req 38.16). */
const ESCAPES_HTML: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa el contenido del asistente antes de renderizarlo en la burbuja (Req 38.16).
 *
 * Convierte `&`, `<`, `>`, `"` y `'` en sus entidades HTML, de modo que cualquier
 * carga maliciosa (`<script>`, atributos `on*=`, `javascript:`) quede inerte como
 * texto y no como marcado ejecutable; el texto plano se preserva visualmente
 * (Property 27). Función pura y determinista.
 *
 * El `&` se procesa primero para no re-escapar las entidades generadas.
 *
 * @param contenido contenido devuelto por el Servicio_Asistente.
 * @returns el contenido con los caracteres sensibles a HTML escapados.
 */
export function escaparHtml(contenido: string): string {
  return contenido.replace(/[&<>"']/g, (caracter) => ESCAPES_HTML[caracter] ?? caracter);
}
