import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoEstadoComponent } from './dialogo-estado.component';

describe('DialogoEstadoComponent', () => {
  let fixture: ComponentFixture<DialogoEstadoComponent>;
  let el: HTMLElement;

  function abrir(entradas: Record<string, unknown> = {}): void {
    fixture.componentRef.setInput('abierto', true);
    fixture.componentRef.setInput('variante', 'error');
    fixture.componentRef.setInput('titulo', 'Algo falló');
    fixture.componentRef.setInput('mensaje', 'Intenta de nuevo.');
    fixture.componentRef.setInput('acciones', { cancelar: 'Cancelar', confirmar: 'Aceptar', reintentar: 'Reintentar' });
    for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }

  function boton(texto: string): HTMLButtonElement {
    const b = Array.from(el.querySelectorAll('button')).find((x) => x.textContent?.trim().endsWith(texto));
    if (!b) throw new Error(`No hay botón ${texto}`);
    return b;
  }

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({ imports: [DialogoEstadoComponent] }).createComponent(DialogoEstadoComponent);
    el = fixture.nativeElement;
  });

  it('muestra rol dialog modal con título y mensaje, y enfoca la acción principal', () => {
    // Given / When
    abrir();
    // Then
    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(el.textContent).toContain('Algo falló');
    expect(document.activeElement).toBe(boton('Reintentar'));
  });

  it('cada acción emite su evento', () => {
    // Given
    abrir();
    const eventos: string[] = [];
    fixture.componentInstance.confirmar.subscribe(() => eventos.push('confirmar'));
    fixture.componentInstance.cancelar.subscribe(() => eventos.push('cancelar'));
    fixture.componentInstance.reintentar.subscribe(() => eventos.push('reintentar'));
    // When
    boton('Aceptar').click();
    boton('Cancelar').click();
    boton('Reintentar').click();
    // Then
    expect(eventos).toEqual(['confirmar', 'cancelar', 'reintentar']);
  });

  it('Esc y el fondo emiten cerrar solo si la configuración lo permite', () => {
    // Given
    const cerrar = jest.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);
    abrir({ cierrePorEsc: false, cierrePorFondo: false });
    // When
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (el.querySelector('.de__fondo') as HTMLElement).click();
    // Then
    expect(cerrar).not.toHaveBeenCalled();
    // When
    fixture.componentRef.setInput('cierrePorEsc', true);
    fixture.componentRef.setInput('cierrePorFondo', true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (el.querySelector('.de__fondo') as HTMLElement).click();
    // Then
    expect(cerrar).toHaveBeenCalledTimes(2);
  });

  it('Tab en la última acción vuelve a la primera (foco atrapado)', () => {
    // Given
    abrir();
    boton('Reintentar').focus();
    // When
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    boton('Reintentar').dispatchEvent(tab);
    // Then
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(boton('Cancelar'));
  });

  it('al cerrarse devuelve el foco al elemento previo', () => {
    // Given
    const previo = document.createElement('button');
    document.body.appendChild(previo);
    previo.focus();
    abrir();
    // When
    fixture.componentRef.setInput('abierto', false);
    fixture.detectChanges();
    // Then
    expect(document.activeElement).toBe(previo);
    previo.remove();
  });

  it('celebra con confeti solo en la variante de éxito', () => {
    // When
    abrir({ variante: 'exito' });
    // Then
    expect(el.querySelector('app-confeti')).not.toBeNull();
    // When
    fixture.componentRef.setInput('variante', 'error');
    fixture.detectChanges();
    // Then
    expect(el.querySelector('app-confeti')).toBeNull();
  });
});
