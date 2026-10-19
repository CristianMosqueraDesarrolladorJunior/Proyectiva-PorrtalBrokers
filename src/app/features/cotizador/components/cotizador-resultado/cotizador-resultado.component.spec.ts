import { proveerCatalogosPrueba } from '../../../../../testing/catalogo-prueba';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CotizadorResultadoComponent } from './cotizador-resultado.component';
import { CotizacionResult } from '../../../../core/models/cotizacion.model';

describe('CotizadorResultadoComponent', () => {
  let fixture: ComponentFixture<CotizadorResultadoComponent>;
  let component: CotizadorResultadoComponent;

  const resultado: CotizacionResult = {
    referencia: 'COT-TEST1234',
    estado: 'COTIZADA',
    conceptos: [
      {
        concepto: 'Arrendamiento',
        base: 24_000_000,
        tasa: 0.035,
        primaNeta: 840_000,
        iva: 159_600,
        total: 999_600,
      },
    ],
    primaNeta: 840_000,
    iva: 159_600,
    total: 999_600,
    comisionEstimada: 99_960,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CotizadorResultadoComponent],
      providers: [proveerCatalogosPrueba()],
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

  it('muestra las 6 columnas del desglose en orden (Req 8.1)', () => {
    // Given / When
    component.resultado = resultado;
    fixture.detectChanges();
    // Then
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th'),
    ).map((th) => (th as HTMLElement).textContent?.trim());
    expect(headers).toEqual([
      'CONCEPTO',
      'BASE DE CÁLCULO',
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
      'Sin contrato firmado la póliza no tiene cobertura',
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

  it('emite "genera tu contrato" conservando el contexto', () => {
    // Given
    component.resultado = resultado;
    fixture.detectChanges();
    const emitido: number[] = [];
    component.generarContrato.subscribe(() => emitido.push(1));
    // When
    (component as unknown as { onGenerarContrato(): void }).onGenerarContrato();
    // Then
    expect(emitido).toEqual([1]);
  });
});
