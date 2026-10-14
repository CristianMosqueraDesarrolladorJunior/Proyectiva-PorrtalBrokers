/** Abre el formulario de actualización de Conocimiento de Cliente (solo URLs https). */
export function abrirFormularioSarlaft(enlace: string | null | undefined): void {
  if (enlace && /^https:\/\//i.test(enlace)) {
    window.open(enlace, '_blank', 'noopener');
  }
}
