import { TestBed } from '@angular/core/testing';

import { ConfetiComponent, generarConfeti } from './confeti.component';

describe('ConfetiComponent', () => {
  afterEach(() => jest.useRealTimers());

  it('genera piezas con trayectoria y color tomados de los tokens', () => {
    // When
    const piezas = generarConfeti(12);
    // Then
    expect(piezas).toHaveLength(12);
    expect(piezas.every((p) => /--x:.*--color:var\(--/.test(p.estilo))).toBe(true);
  });

  it('se retira solo al terminar la animación y no recibe clics', () => {
    // Given
    jest.useFakeTimers();
    const fixture = TestBed.configureTestingModule({ imports: [ConfetiComponent] }).createComponent(ConfetiComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    // Then
    expect(el.querySelector('.cf')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.cf__pieza').length).toBeGreaterThan(0);
    // When
    jest.advanceTimersByTime(4200);
    fixture.detectChanges();
    // Then
    expect(el.querySelector('.cf')).toBeNull();
  });
});
