import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import fc from 'fast-check';

import { GUIONES_TOUR } from '../../../core/onboarding/guion-tour';
import { TourBienvenidaService } from '../../../core/onboarding/tour-bienvenida.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { RenovacionService } from '../../../core/services/renovacion.service';
import { SessionService } from '../../../core/services/session.service';
import { RecorridoPlataformaComponent, anterior, siguiente } from './recorrido-plataforma.component';

describe('RecorridoPlataformaComponent', () => {
  let fixture: ComponentFixture<RecorridoPlataformaComponent>;
  let router: { url: string; navigateByUrl: jest.Mock };
  let onboarding: { consultarEstado: jest.Mock; marcarVisto: jest.Mock };
  let tour: TourBienvenidaService;

  const boton = (texto: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;
  const texto = (): string => fixture.nativeElement.textContent as string;
  const clic = (t: string): void => {
    boton(t).click();
    fixture.detectChanges();
  };

  function crear(tourVisto: boolean): void {
    router = {
      url: '/app/perfil',
      navigateByUrl: jest.fn((u: string) => {
        router.url = u;
        return Promise.resolve(true);
      }),
    };
    onboarding = {
      consultarEstado: jest.fn().mockReturnValue(of({ perfil: 'BROKER', tourVisto })),
      marcarVisto: jest.fn().mockReturnValue(of({ perfil: 'BROKER', tourVisto: true })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: OnboardingService, useValue: onboarding },
        {
          provide: RenovacionService,
          useValue: {
            portafolio: jest.fn().mockReturnValue(of({
              polizas: [
                { numero: '5010000000099', estado: 'VENCIDA', fechaVencimiento: '2026-01-01' },
                { numero: '5010000000007', estado: 'A_PUNTO_DE_VENCER', fechaVencimiento: '2026-11-01' },
              ],
            })),
          },
        },
      ],
    });
    TestBed.inject(SessionService).establecerPerfil({ nombre: 'Prueba', rol: 'BROKER', estadoCuenta: 'REGISTRADO' });
    tour = TestBed.inject(TourBienvenidaService);
    fixture = TestBed.createComponent(RecorridoPlataformaComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  it('Given el primer ingreso, When carga, Then se abre y lleva a la primera vista del perfil', () => {
    crear(false);
    expect(tour.abierto()).toBe(true);
    expect(texto()).toContain('Vista 1 de 12');
    expect(texto()).toContain('Seguimiento');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/seguimiento');
  });

  it('Given quien ya lo vio, When carga, Then no se abre solo', () => {
    crear(true);
    expect(tour.abierto()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Given el recorrido, When avanza y retrocede, Then va a cada vista, una por una', () => {
    crear(false);
    clic('Siguiente');
    expect(texto()).toContain('Cotizador');
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/app/cotizador');
    clic('Anterior');
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/app/seguimiento');
    expect(boton('Anterior').disabled).toBe(true);
  });

  it('Given el recorrido del broker, When llega a su primera renovación, Then entra a la póliza más urgente y explica esa pantalla', () => {
    crear(false);
    for (let i = 0; i < 6; i++) clic('Siguiente'); // hasta «Gestiona tu primera renovación»
    expect(texto()).toContain('Gestiona tu primera renovación');
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/app/renovaciones/detalle?numeroPolizaInicial=5010000000007');
    clic('Siguiente');
    expect(texto()).toContain('Los datos de tu póliza');
    // Los pasos de la pantalla no navegan: explican lo que se ve.
    const llamadas = router.navigateByUrl.mock.calls.length;
    clic('Siguiente');
    expect(router.navigateByUrl.mock.calls.length).toBe(llamadas);
  });

  it('Given la última vista, When finaliza, Then cierra, vuelve a donde estaba y lo marca como visto', () => {
    crear(false);
    for (let i = 0; i < GUIONES_TOUR.BROKER.pasos.length - 1; i++) clic('Siguiente');
    clic('Finalizar');
    expect(tour.abierto()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/app/perfil');
    expect(onboarding.marcarVisto).toHaveBeenCalledTimes(1);
  });

  it('Given el recorrido, When sale, Then siempre hay salida y no vuelve a ofrecerse', () => {
    crear(false);
    clic('Salir');
    expect(tour.abierto()).toBe(false);
    expect(onboarding.marcarVisto).toHaveBeenCalledTimes(1);
  });

  it('Given que ya lo vio, When lo reabre desde el menú, Then recorre otra vez sin volver a marcarlo', () => {
    crear(true);
    tour.abrir();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(texto()).toContain('Vista 1 de 12');
    clic('Salir');
    expect(onboarding.marcarVisto).not.toHaveBeenCalled();
  });
});

describe('índice del recorrido (invariante)', () => {
  it('tras cualquier secuencia de avances y retrocesos se mantiene entre 0 y total-1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.array(fc.boolean(), { maxLength: 60 }), (total, movimientos) => {
        let indice = 0;
        for (const avanza of movimientos) {
          indice = avanza ? siguiente(indice, total) : anterior(indice);
          if (indice < 0 || indice > total - 1) return false;
        }
        return true;
      }),
    );
  });
});

describe('guiones del recorrido', () => {
  it('cada perfil tiene pasos con una vista real: /admin para la consola y /app para el portal', () => {
    for (const [perfil, guion] of Object.entries(GUIONES_TOUR)) {
      expect(guion.pasos.length).toBeGreaterThan(0);
      const prefijo = perfil === 'ADMINISTRADOR' || perfil === 'COMERCIAL' ? '/admin/' : '/app/';
      // Los pasos sin ruta explican la pantalla en la que ya está el recorrido (o la abren por dato, como la primera renovación).
      guion.pasos.filter((p) => p.ruta).forEach((p) => expect(p.ruta!.startsWith(prefijo)).toBe(true));
    }
  });

  it('el comercial no recorre Comerciales; el administrador sí', () => {
    expect(GUIONES_TOUR.COMERCIAL.pasos.some((p) => p.ruta === '/admin/comerciales')).toBe(false);
    expect(GUIONES_TOUR.ADMINISTRADOR.pasos.some((p) => p.ruta === '/admin/comerciales')).toBe(true);
  });

  it('el prospecto termina en su perfil, donde se vuelve broker, y no recorre módulos bloqueados', () => {
    const rutas = GUIONES_TOUR.PROSPECTO.pasos.map((p) => p.ruta);
    expect(rutas.at(-1)).toBe('/app/perfil');
    expect(rutas).not.toContain('/app/comisiones');
  });
});
