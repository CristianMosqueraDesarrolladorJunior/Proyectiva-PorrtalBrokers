/**
 * Descarga un archivo recibido como blob (respuesta autenticada del backend) con un enlace temporal.
 * Más fiable que `window.open` tras una petición asíncrona, que los navegadores bloquean como pop-up.
 */
export function descargarArchivo(contenido: Blob, nombre: string): void {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
