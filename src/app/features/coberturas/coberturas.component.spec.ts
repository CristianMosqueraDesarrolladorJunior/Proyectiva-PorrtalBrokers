import { proveerCatalogosPrueba } from '../../../testing/catalogo-prueba';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CoberturasComponent } from './coberturas.component';
import {
  CoberturasService,
  CoberturaCatalogo,
} from '../../core/services/coberturas.service';

/** Acceso a los miembros protegidos del componente para las pruebas. */
type CoberturasComponentInterno = CoberturasComponent & {
  coberturas: () => readonly CoberturaCatalogo[];
  cargando: () => boolean;
  error: () => string | null;
  detalleAbierto: () => boolean;
  coberturaDetalle: () => CoberturaCatalogo | null;
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
      providers: [{ provide: CoberturasService, useValue: { listar } }, proveerCatalogosPrueba()],
    });
    return TestBed.createComponent(CoberturasComponent)
      .componentInstance as CoberturasComponentInterno;
  }

  it('carga el catálogo de coberturas para consulta (Req 14.1)', () => {
    // Given / When
    const componente = crearComponente(() => of(catalogo));
    // Then
    expect(componente.cargando()).toBe(false);
    expect(componente.coberturas()).toHaveLength(2);
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
      'No pudimos cargar las coberturas. Intenta de nuevo.',
    );
  });
});
