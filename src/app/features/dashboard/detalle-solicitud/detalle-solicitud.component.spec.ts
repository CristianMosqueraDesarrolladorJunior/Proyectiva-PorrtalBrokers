import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  DetalleSolicitudComponent,
  construirFilasDetalle,
} from './detalle-solicitud.component';
import { DetalleSolicitud } from '../../../core/models/solicitud.model';

/** Establece la referencia y dispara ngOnChanges como lo haría el binding del template. */
function seleccionar(
  componente: DetalleSolicitudComponent,
  referencia: string | null,
): void {
  const anterior = componente.referencia;
  componente.referencia = referencia;
  componente.ngOnChanges({
    referencia: new SimpleChange(anterior, referencia, anterior === null),
  });
}

describe('DetalleSolicitudComponent', () => {
  let fixture: ComponentFixture<DetalleSolicitudComponent>;
  let componente: DetalleSolicitudComponent;
  let httpMock: HttpTestingController;

  const detalle: DetalleSolicitud = {
    referencia: 'REF-001',
    cliente: 'M**** P****',
    producto: 'Arrendamiento',
    estado: 'en_revision',
    estadoPago: 'Canon $1.200.000',
    fecha: '2026-01-15',
    comision: 150000,
    timeline: [
      { titulo: 'Radicada', fecha: '2026-01-10', completado: true },
      { titulo: 'En revisión', fecha: '2026-01-15', completado: false },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DetalleSolicitudComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(DetalleSolicitudComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('no consulta ni abre el drawer sin referencia', () => {
    // When
    fixture.detectChanges();
    // Then
    httpMock.expectNone('/api/v1/solicitudes/REF-001');
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();
  });

  it('obtiene el Detalle_Solicitud por referencia con withCredentials (Req 34.4)', () => {
    // Given / When
    fixture.detectChanges();
    seleccionar(componente, 'REF-001');
    // Then
    const req = httpMock.expectOne('/api/v1/solicitudes/REF-001');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(detalle);
  });

  it('muestra el drawer con los campos enmascarados y la línea de tiempo (Req 34.1, 34.2)', () => {
    // Given
    fixture.detectChanges();
    seleccionar(componente, 'REF-001');
    // When
    httpMock.expectOne('/api/v1/solicitudes/REF-001').flush(detalle);
    fixture.detectChanges();
    // Then
    const html: string = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('.drawer')).not.toBeNull();
    expect(html).toContain('M**** P****');
    expect(html).toContain('Arrendamiento');
    expect(fixture.nativeElement.querySelector('app-timeline')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.timeline-item').length).toBe(2);
  });

  it('cierra el detalle, oculta el drawer y emite cerrar (Req 34.3)', () => {
    // Given
    const cerrarSpy = jest.fn();
    componente.cerrar.subscribe(cerrarSpy);
    fixture.detectChanges();
    seleccionar(componente, 'REF-001');
    httpMock.expectOne('/api/v1/solicitudes/REF-001').flush(detalle);
    fixture.detectChanges();
    // When
    fixture.nativeElement.querySelector('.drawer-footer__close').click();
    fixture.detectChanges();
    // Then
    expect(cerrarSpy).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();
  });

  it('muestra un mensaje genérico si falla la consulta del detalle', () => {
    // Given
    fixture.detectChanges();
    seleccionar(componente, 'REF-001');
    // When
    httpMock
      .expectOne('/api/v1/solicitudes/REF-001')
      .flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    // Then
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  describe('construirFilasDetalle', () => {
    it('mapea los 7 campos en el orden del prototipo con estado legible (Req 34.1)', () => {
      // When
      const filas = construirFilasDetalle(detalle);
      // Then
      expect(filas.map((f) => f.etiqueta)).toEqual([
        'Referencia',
        'Cliente',
        'Producto',
        'Estado',
        'Canon / Pago',
        'Fecha',
        'Comisión',
      ]);
      expect(filas[3].valor).toBe('En revisión');
      expect(filas[1].valor).toBe('M**** P****');
    });
  });
});
