import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import fc from 'fast-check';

import { RECORRIDOS_POR_VISTA, recorridoDeVista } from '../../../core/onboarding/guion-tour';
import { TourBienvenidaService } from '../../../core/onboarding/tour-bienvenida.service';
import { SessionService } from '../../../core/services/session.service';
import { RecorridoPlataformaComponent, anterior, buscarObjetivo, siguiente } from './recorrido-plataforma.component';

describe('RecorridoPlataformaComponent (recorrido por vista, guiado y bloqueante)', () => {
  let fixture: ComponentFixture<RecorridoPlataformaComponent>;
  let router: { url: string; events: Subject<unknown> };
  let tour: TourBienvenidaService;

  const boton = (texto: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;
  const texto = (): string => fixture.nativeElement.textContent as string;
  const clic = (t: string): void => {
    boton(t).click();
    fixture.detectChanges();
  };
  const navegar = (url: string): void => {
    router.url = url;
    router.events.next(new NavigationEnd(1, url, url));
    TestBed.flushEffects();
    fixture.detectChanges();
  };

  function crear(url = '/app/seguimiento', rol: 'BROKER' | 'ADMINISTRADOR' = 'BROKER'): void {
    localStorage.clear();
    router = { url, events: new Subject<unknown>() };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    TestBed.inject(SessionService).establecerPerfil({ nombre: 'Prueba', rol, estadoCuenta: 'REGISTRADO' });
    tour = TestBed.inject(TourBienvenidaService);
    fixture = TestBed.createComponent(RecorridoPlataformaComponent);
    fixture.detectChanges();
    navegar(url);
  }

  it('Given la primera vez en una vista, When carga, Then su recorrido se abre solo y bloquea la plataforma', () => {
    crear();
    const total = recorridoDeVista('BROKER', '/app/seguimiento').length;
    expect(tour.abierto()).toBe(true);
    expect(texto()).toContain(`Paso 1 de ${total}`);
    expect(fixture.nativeElement.querySelector('[aria-modal="true"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.rt__bloqueo')).not.toBeNull();
  });

  it('Given el recorrido de la vista, When avanza hasta Finalizar, Then se cierra, avisa y no vuelve a abrirse solo', () => {
    crear();
    const total = recorridoDeVista('BROKER', '/app/seguimiento').length;
    for (let i = 1; i < total; i++) clic('Siguiente');
    expect(texto()).toContain(`Paso ${total} de ${total}`);
    clic('Finalizar');
    expect(tour.abierto()).toBe(false);
    navegar('/app/cotizador');
    clic('Omitir recorrido');
    navegar('/app/seguimiento');
    expect(tour.abierto()).toBe(false);
  });

  it('Given otra vista, When el usuario entra, Then se abre el recorrido propio de esa vista', () => {
    crear();
    clic('Omitir recorrido');
    navegar('/app/comisiones');
    expect(tour.abierto()).toBe(true);
    expect(texto()).toContain(recorridoDeVista('BROKER', '/app/comisiones')[0].titulo);
  });

  it('Given una vista ya recorrida, When pulsa «Ver recorrido», Then lo repite desde el paso 1', () => {
    crear();
    clic('Omitir recorrido');
    tour.abrir();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(tour.abierto()).toBe(true);
    expect(texto()).toContain('Paso 1 de');
  });

  it('Given el recorrido abierto, When pulsa Esc, Then se omite', () => {
    crear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(tour.abierto()).toBe(false);
  });

  it('Given una vista sin recorrido, When pulsa «Ver recorrido», Then no queda abierto sin pasos', () => {
    crear('/app/sin-recorrido');
    tour.abrir();
    expect(tour.abierto()).toBe(false);
  });

  it('Given la consola, When el administrador entra a Negocios, Then ve el recorrido de esa vista', () => {
    crear('/admin/negocios', 'ADMINISTRADOR');
    expect(tour.abierto()).toBe(true);
    expect(texto()).toContain(RECORRIDOS_POR_VISTA.ADMINISTRADOR['/admin/negocios'][0].titulo);
  });

  it('Cada vista del menú de cada perfil tiene recorrido con al menos dos pasos', () => {
    for (const [perfil, vistas] of Object.entries(RECORRIDOS_POR_VISTA)) {
      for (const [ruta, pasos] of Object.entries(vistas)) {
        expect([perfil, ruta, pasos.length >= 2]).toEqual([perfil, ruta, true]);
      }
    }
  });

  it('buscarObjetivo toma el primer selector que existe y se ve', () => {
    const raiz = document.createElement('div');
    raiz.innerHTML = '<p class="b">b</p>';
    document.body.appendChild(raiz);
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 10, height: 10 } as DOMRect);
    expect(buscarObjetivo(['.no-existe', ':::invalido', '.b'], raiz)?.textContent).toBe('b');
    expect(buscarObjetivo(['.no-existe'], raiz)).toBeNull();
    raiz.remove();
  });

  it('Propiedad: siguiente y anterior siempre quedan dentro de los pasos', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 0, max: 19 }), (total, i) => {
        const indice = Math.min(i, total - 1);
        const s = siguiente(indice, total);
        const a = anterior(indice);
        return s >= 0 && s < total && a >= 0 && a < total;
      }),
    );
  });
});
