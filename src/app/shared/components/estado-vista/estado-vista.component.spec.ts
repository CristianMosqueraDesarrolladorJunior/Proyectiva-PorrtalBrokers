import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EstadoVistaComponent } from './estado-vista.component';

@Component({
  standalone: true,
  imports: [EstadoVistaComponent],
  template: `
    <app-estado-vista [cargando]="cargando" [error]="error" [vacio]="vacio" tituloVacio="Nada aún" (reintentar)="reintentos = reintentos + 1">
      <p class="contenido">Datos</p>
    </app-estado-vista>
  `,
})
class AnfitrionComponent {
  cargando = false;
  error = false;
  vacio = false;
  reintentos = 0;
}

describe('EstadoVistaComponent', () => {
  function crear(estado: Partial<AnfitrionComponent>) {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    Object.assign(fixture.componentInstance, estado);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra el contenido cuando hay datos', () => {
    expect(crear({}).nativeElement.querySelector('.contenido')).not.toBeNull();
  });

  it('cargando tiene prioridad sobre error y vacío', () => {
    const el: HTMLElement = crear({ cargando: true, error: true, vacio: true }).nativeElement;
    expect(el.querySelector('app-skeleton')).not.toBeNull();
    expect(el.querySelector('.contenido')).toBeNull();
  });

  it('en error ofrece reintentar', () => {
    const fixture = crear({ error: true, vacio: true });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-empty-state')).toBeNull();
    el.querySelector<HTMLButtonElement>('app-alert-banner button')!.click();
    expect(fixture.componentInstance.reintentos).toBe(1);
  });

  it('vacío muestra el estado vacío con su título', () => {
    const el: HTMLElement = crear({ vacio: true }).nativeElement;
    expect(el.querySelector('app-empty-state')?.textContent).toContain('Nada aún');
    expect(el.querySelector('.contenido')).toBeNull();
  });
});
