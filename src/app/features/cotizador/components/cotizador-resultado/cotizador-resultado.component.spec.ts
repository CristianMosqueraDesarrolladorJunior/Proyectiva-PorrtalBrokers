import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CotizadorResultadoComponent } from './cotizador-resultado.component';
import { CotizacionResult } from '../../../../core/models/cotizacion.model';

describe('CotizadorResultadoComponent', () => {
  let fixture: ComponentFixture<CotizadorResultadoComponent>;
  let component: CotizadorResultadoComponent;

  const resultado: CotizacionResult = {
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CotizadorResultadoComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CotizadorResultadoComponent);
    component = fixture.componentInstance;
  });

  it('no muestra la tabla ni la alerta cuando no hay cotización (Req 9.4)', () => {
    // Given / When
    component.resultado = null;
    fixture.detectChanges();
    // Then
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-alert-banner')).toBeNull();
  });

  it('muestra las 8 columnas del desglose en orden (Req 8.1)', () => {
    // Given / When
    component.resultado = resultado;
    fixture.detectChanges();
    // Then
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th'),
    ).map((th) => (th as HTMLElement).textContent?.trim());
    expect(headers).toEqual([
      'CONCEPTO',
      'VALOR ASEGURADO',
      'MESES',
      'BASE CÁLCULO PERIODO',
      'TASA',
      'PRIMA NETA',
      'IVA (19%)',
      'TOTAL',
    ]);
  });

  it('renderiza una fila por concepto recibido del backend (Req 8.7)', () => {
    // Given / When
    component.resultado = resultado;
    fixture.detectChanges();
    // Then
    const filas = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(filas.length).toBe(1);
  });

  it('muestra la alerta al propietario "sin contrato firmado no hay seguro" (Req 8.6)', () => {
    // Given / When
    component.resultado = resultado;
    fixture.detectChanges();
    // Then
    const alerta = fixture.nativeElement.querySelector('app-alert-banner');
    expect(alerta).not.toBeNull();
    expect((alerta as HTMLElement).textContent).toContain(
      'Sin contrato firmado no hay seguro',
    );
  });

  it('deshabilita "Descargar PDF" cuando no existe cotización (Req 9.4)', () => {
    // Given
    component.resultado = null;
    fixture.detectChanges();
    // When
    const emitido: number[] = [];
    component.descargarPdf.subscribe(() => emitido.push(1));
    (
      component as unknown as { onDescargarPdf(): void }
    ).onDescargarPdf();
    // Then
    expect(
      (component as unknown as { pdfDeshabilitado: boolean }).pdfDeshabilitado,
    ).toBe(true);
    expect(emitido).toEqual([]);
  });

  it('habilita y emite "Descargar PDF" con una cotización calculada (Req 9.1)', () => {
    // Given
    component.resultado = resultado;
    fixture.detectChanges();
    const emitido: number[] = [];
    component.descargarPdf.subscribe(() => emitido.push(1));
    // When
    (component as unknown as { onDescargarPdf(): void }).onDescargarPdf();
    // Then
    expect(
      (component as unknown as { pdfDeshabilitado: boolean }).pdfDeshabilitado,
    ).toBe(false);
    expect(emitido).toEqual([1]);
  });

  it('no permite descargar el PDF mientras hay una descarga en curso (Req 9.1)', () => {
    // Given
    component.resultado = resultado;
    component.descargandoPdf = true;
    fixture.detectChanges();
    const emitido: number[] = [];
    component.descargarPdf.subscribe(() => emitido.push(1));
    // When
    (component as unknown as { onDescargarPdf(): void }).onDescargarPdf();
    // Then
    expect(emitido).toEqual([]);
  });

  it('emite "modificar datos" para rehabilitar la edición (Req 9.2)', () => {
    // Given
    component.resultado = resultado;
    fixture.detectChanges();
    const emitido: number[] = [];
    component.modificarDatos.subscribe(() => emitido.push(1));
    // When
    (component as unknown as { onModificarDatos(): void }).onModificarDatos();
    // Then
    expect(emitido).toEqual([1]);
  });

  it('emite "radicar póliza" conservando el contexto (Req 9.3)', () => {
    // Given
    component.resultado = resultado;
    fixture.detectChanges();
    const emitido: number[] = [];
    component.radicarPoliza.subscribe(() => emitido.push(1));
    // When
    (component as unknown as { onRadicarPoliza(): void }).onRadicarPoliza();
    // Then
    expect(emitido).toEqual([1]);
  });
});
