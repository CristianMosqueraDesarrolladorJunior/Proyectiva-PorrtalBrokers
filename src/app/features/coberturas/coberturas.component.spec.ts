import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CoberturasComponent } from './coberturas.component';
import {
  CoberturasService,
  CoberturaCatalogo,
} from '../../core/services/coberturas.service';

/** Acceso a los miembros protegidos del componente para las pruebas. */
type CoberturasComponentInterno = CoberturasComponent & {
  coberturas: () => readonly {
    catalogo: CoberturaCatalogo;
    activa: boolean;
    montoAsegurado: number;
  }[];
  cargando: () => boolean;
  error: () => string | null;
  detalleAbierto: () => boolean;
  coberturaDetalle: () => CoberturaCatalogo | null;
  alternarCobertura: (id: string, activa: boolean) => void;
  incrementar: (id: string) => void;
  decrementar: (id: string) => void;
  consultarDetalle: (cobertura: CoberturaCatalogo) => void;
  cerrarDetalle: () => void;
  filasDetalle: () => readonly { etiqueta: string; valor: string }[];
};

describe('CoberturasComponent (Req 14)', () => {
  const catalogo: readonly CoberturaCatalogo[] = [
    {
      id: 'danos-faltantes',
      nombre: 'Daños y faltantes',
      descripcion: 'Cubre daños y faltantes del inmueble.',
      montoDefecto: 1_000_000,
      pasoMonto: 500_000,
    },
    {
      id: 'servicios-publicos',
      nombre: 'Servicios públicos',
      descripcion: 'Cubre servicios públicos pendientes.',
      montoDefecto: 0,
      pasoMonto: 500_000,
    },
  ];

  function crearComponente(
    listar: () => ReturnType<CoberturasService['listar']>,
  ): CoberturasComponentInterno {
    TestBed.configureTestingModule({
      providers: [{ provide: CoberturasService, useValue: { listar } }],
    });
    return TestBed.createComponent(CoberturasComponent)
      .componentInstance as CoberturasComponentInterno;
  }

  it('carga el catálogo de coberturas inactivas por defecto (Req 14.1)', () => {
    // Given / When
    const componente = crearComponente(() => of(catalogo));
    // Then
    expect(componente.cargando()).toBe(false);
    expect(componente.coberturas()).toHaveLength(2);
    expect(componente.coberturas().every((c) => !c.activa)).toBe(true);
    expect(componente.coberturas()[0].montoAsegurado).toBe(1_000_000);
  });

  it('activa la cobertura al conmutar el toggle (Req 14.2)', () => {
    // Given
    const componente = crearComponente(() => of(catalogo));
    // When
    componente.alternarCobertura('danos-faltantes', true);
    // Then
    expect(componente.coberturas()[0].activa).toBe(true);
  });

  it('desactiva la cobertura al conmutar el toggle (Req 14.3)', () => {
    // Given
    const componente = crearComponente(() => of(catalogo));
    componente.alternarCobertura('danos-faltantes', true);
    // When
    componente.alternarCobertura('danos-faltantes', false);
    // Then
    expect(componente.coberturas()[0].activa).toBe(false);
  });

  it('incrementa y decrementa el monto en pasos de $500.000 sin negativos (Req 14.4)', () => {
    // Given
    const componente = crearComponente(() => of(catalogo));
    // When
    componente.incrementar('servicios-publicos');
    // Then
    expect(componente.coberturas()[1].montoAsegurado).toBe(500_000);

    // When — decrementa dos veces desde 500.000
    componente.decrementar('servicios-publicos');
    componente.decrementar('servicios-publicos');
    // Then — nunca baja de $0
    expect(componente.coberturas()[1].montoAsegurado).toBe(0);
  });

  it('abre el drawer con el detalle de la cobertura seleccionada (Req 14.5)', () => {
    // Given
    const componente = crearComponente(() => of(catalogo));
    // When
    componente.consultarDetalle(catalogo[0]);
    // Then
    expect(componente.detalleAbierto()).toBe(true);
    expect(componente.coberturaDetalle()).toEqual(catalogo[0]);
    expect(componente.filasDetalle()).toEqual([
      { etiqueta: 'Cobertura', valor: 'Daños y faltantes' },
      { etiqueta: 'Descripción', valor: 'Cubre daños y faltantes del inmueble.' },
    ]);
  });

  it('cierra el drawer del detalle (Req 14.5)', () => {
    // Given
    const componente = crearComponente(() => of(catalogo));
    componente.consultarDetalle(catalogo[0]);
    // When
    componente.cerrarDetalle();
    // Then
    expect(componente.detalleAbierto()).toBe(false);
  });

  it('muestra un mensaje genérico si falla la carga del catálogo', () => {
    // Given / When
    const componente = crearComponente(() => throwError(() => new Error('fallo')));
    // Then
    expect(componente.cargando()).toBe(false);
    expect(componente.error()).toBe(
      'No fue posible cargar las coberturas. Intenta nuevamente.',
    );
  });
});
