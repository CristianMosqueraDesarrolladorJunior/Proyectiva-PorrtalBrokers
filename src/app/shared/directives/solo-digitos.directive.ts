import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';

/**
 * Campos de cédula/documento: solo dígitos (al escribir y al pegar), como el cotizador actual. Funciona con
 * `ngModel`, formularios reactivos y `[value]`+`(input)`: limpia el valor y vuelve a emitir `input`.
 * `[appSoloDigitos]="false"` lo desactiva (p. ej. pasaporte, que es alfanumérico).
 */
@Directive({
  selector: 'input[appSoloDigitos]',
  standalone: true,
  host: { '[attr.inputmode]': "activo ? 'numeric' : null" },
})
export class SoloDigitosDirective {
  private readonly elemento = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Vacío o `true` activa el filtro; `false` lo apaga. */
  @Input() set appSoloDigitos(valor: boolean | '') {
    this.activo = valor !== false;
  }
  protected activo = true;

  @HostListener('input')
  limpiar(): void {
    const input = this.elemento.nativeElement;
    const limpio = input.value.replace(/\D/g, '');
    if (this.activo && limpio !== input.value) {
      input.value = limpio;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
