/**
 * Huella SHA-256 (hex) del contenido de un archivo, para detectar en el navegador el mismo documento cargado dos
 * veces antes de subirlo. El servidor sigue siendo la fuente de verdad (compara el contenido).
 *
 * @returns la huella, o `null` si el navegador no soporta `crypto.subtle` o no puede leer el archivo
 */
export async function huellaArchivo(archivo: Blob): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      return null;
    }
    const resumen = await subtle.digest('SHA-256', await archivo.arrayBuffer());
    return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * Busca otro documento con la misma huella.
 *
 * @param huellas huella ya registrada por tipo de documento
 * @returns el tipo de documento duplicado, o `undefined` si no hay
 */
export function tipoConMismaHuella(
  huellas: ReadonlyMap<string, string>,
  tipo: string,
  huella: string,
): string | undefined {
  for (const [otro, existente] of huellas) {
    if (otro !== tipo && existente === huella) {
      return otro;
    }
  }
  return undefined;
}
