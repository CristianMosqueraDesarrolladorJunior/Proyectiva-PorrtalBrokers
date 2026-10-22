/**
 * La consulta SARLAFT no está habilitada para el portal (parámetro de negocio `SARLAFT_CONSULTA_HABILITADA`, V86):
 * mientras valga 0, cada flujo pide el formulario de Conocimiento de Cliente descargado, diligenciado y cargado.
 */
export const PARAMETRO_CONSULTA_SARLAFT = 'SARLAFT_CONSULTA_HABILITADA';

/** `true` solo si el parámetro existe y vale 1 (sin parámetro se asume apagada, como en producción). */
export function consultaSarlaftHabilitada(catalogo: { parametro(clave: string): number }): boolean {
  return catalogo.parametro(PARAMETRO_CONSULTA_SARLAFT) === 1;
}
