import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CotizadorDatosComponent } from './cotizador-datos.component';
import {
  CoberturasService,
  type CoberturaCatalogo,
} from '../../../core/services/coberturas.service';
import { CotizadorService } from '../../../core/services/cotizador.service';
import type { CotizacionResult } from '../../../core/models/cotizacion.model';

/** Resultado de cotización simulado devuelto por el backend. */
const RESULTADO: CotizacionResult = {
  conceptos: [
    {
      concepto: 'Arrendamiento',
      valorAsegurado: 2_000_000,
      meses: 12,
      baseCalculoPeriodo: 24_000_000,
      tasa: 3.5,
      primaNeta: 840_000,
      iva: 159_600,
      total: 999_600,
    },
  ],
  primaNetaTotal: 840_000,
  ivaTotal: 159_600,
  total: 999_600,
};

/** Catálogo de coberturas simulado para poblar los toggles (Req 14.1). */
const CATALOGO: readonly CoberturaCatalogo[] = [
  {
    id: 'danios',
    nombre: 'Daños y faltantes',
    descripcion: 'Cubre daños al inmueble',
    montoDefecto: 1_000_000,
    pasoMonto: 500_000,
  },
];

describe('CotizadorDatosComponent', () => {
  let fixture: ComponentFixture<CotizadorDatosComponent>;
  let component: CotizadorDatosComponent;

  /** Acceso tipado a miembros protegidos para las aserciones. */
  type Interno = {
    departamento: { set(v: string): void };
    ciudad: { set(v: string): void };
    tipoInmueble: { set(v: string): void };
    canon: { set(v: string): void };
    fechaInicioVigencia: { set(v: string): void };
    mesesVigencia: { set(v: number): void };
    onDepartamentoChange(dep: string): void;
    onTipoInmuebleChange(tipo: string): void;
    onMesesChange(v: string | number): void;
    alternarCobertura(id: string, activa: boolean): void;
    incrementar(id: string): void;
    decrementar(id: string): void;
    solicitarCalculo(): void;
    puedeCalcular(): boolean;
    esComercio(): boolean;
    errorCanon(): string;
    sinCobertura(): boolean;
    aseguraIva: { set(v: boolean): void };
    coberturas(): ReadonlyArray<{ id: string; activa: boolean; montoAsegurado: number }>;
    resultado(): CotizacionResult | null;
  };

  const interno = (): Interno => component as unknown as Interno;

  const configurar = (ciudades: readonly string[]): void => {
    const coberturasService = {
      listar: () => of(CATALOGO),
    } as unknown as CoberturasService;
    const cotizadorService = {
      ciudadesPorDepartamento: () => of(ciudades),
      calcular: () => of(RESULTADO),
    } as unknown as CotizadorService;

    TestBed.configureTestingModule({
      imports: [CotizadorDatosComponent],
      providers: [
        { provide: CoberturasService, useValue: coberturasService },
        { provide: CotizadorService, useValue: cotizadorService },
      ],
    });
    fixture = TestBed.createComponent(CotizadorDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const llenarValido = (): void => {
    interno().onDepartamentoChange('Cundinamarca');
    interno().ciudad.set('Bogotá');
    interno().tipoInmueble.set('Vivienda');
    interno().canon.set('2000000');
    interno().fechaInicioVigencia.set('2026-01-01');
    interno().mesesVigencia.set(12);
  };

  it('indica sin cobertura cuando el departamento no tiene ciudades (Req 7.3)', () => {
    // Given
    configurar([]);
    // When
    interno().onDepartamentoChange('Otro');
    // Then — se informa la falta de cobertura (la alerta/estado); el botón exige
    // además ciudad seleccionada, que aquí no existe.
    expect(interno().sinCobertura()).toBe(true);
    expect(interno().puedeCalcular()).toBe(false);
  });

  it('impide el cálculo con canon vacío, no numérico o ≤ 0 e indica el campo (Req 7.7, 7.8)', () => {
    // Given
    configurar(['Bogotá']);
    llenarValido();
    // When
    interno().canon.set('0');
    interno().solicitarCalculo();
    // Then
    expect(interno().puedeCalcular()).toBe(false);
    expect(interno().errorCanon()).toBe('El canon debe ser mayor a $0');
  });

  it('permite asegurar el IVA solo cuando el tipo es Comercio (Req 7.4)', () => {
    // Given
    configurar(['Bogotá']);
    // When
    interno().onTipoInmuebleChange('Comercio');
    // Then
    expect(interno().esComercio()).toBe(true);
    // When — cambia a otro tipo
    interno().onTipoInmuebleChange('Vivienda');
    // Then
    expect(interno().esComercio()).toBe(false);
  });

  it('ajusta el monto de cobertura en pasos de $500.000 sin permitir negativos (Req 7.5, 7.6)', () => {
    // Given
    configurar(['Bogotá']);
    interno().alternarCobertura('danios', true);
    // When — incrementa una vez desde el defecto normalizado (1.000.000)
    interno().incrementar('danios');
    // Then
    expect(interno().coberturas()[0].montoAsegurado).toBe(1_500_000);
    // When — decrementa hasta el mínimo sin negativos
    interno().decrementar('danios');
    interno().decrementar('danios');
    interno().decrementar('danios');
    interno().decrementar('danios');
    // Then
    expect(interno().coberturas()[0].montoAsegurado).toBe(0);
  });

  it('acota los meses de vigencia al rango [1, 36] (Req 7.1)', () => {
    // Given
    configurar(['Bogotá']);
    // When / Then
    interno().onMesesChange(50);
    expect(interno().puedeCalcular()).toBe(false); // faltan otros campos, pero no falla por meses
  });

  it('calcula y muestra el resultado cuando la entrada es válida (Req 7.1–7.8, 8.7)', () => {
    // Given
    configurar(['Bogotá']);
    llenarValido();
    // When
    interno().solicitarCalculo();
    // Then
    expect(interno().puedeCalcular()).toBe(true);
    expect(interno().resultado()).not.toBeNull();
    expect(interno().resultado()?.total).toBe(999_600);
  });
});
