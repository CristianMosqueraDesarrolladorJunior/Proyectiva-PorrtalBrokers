import { TestBed } from '@angular/core/testing';

import { OverlayCargaComponent } from './overlay-carga.component';

describe('OverlayCargaComponent', () => {
  it('muestra la escalerita con el mensaje en la variante pedida y se oculta al terminar', () => {
    // Given
    const fixture = TestBed.configureTestingModule({ imports: [OverlayCargaComponent] }).createComponent(OverlayCargaComponent);
    const el: HTMLElement = fixture.nativeElement;
    // When
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('variante', 'pantalla');
    fixture.componentRef.setInput('mensaje', 'Enviando solicitud...');
    fixture.detectChanges();
    // Then
    expect(el.querySelector('.oc--pantalla app-escalerita-loader')?.textContent).toContain('Enviando solicitud...');
    // When
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    // Then
    expect(el.querySelector('.oc')).toBeNull();
  });
});
