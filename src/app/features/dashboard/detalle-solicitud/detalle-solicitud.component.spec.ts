import { CATALOGOS_PRUEBA, proveerCatalogosPrueba } from '../../../../testing/catalogo-prueba';
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
        proveerCatalogosPrueba(),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(DetalleSolicitudComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // El procedimiento del área es opcional para estas pruebas: si quedó pendiente se responde 404.
    httpMock
      .match((r) => r.url.endsWith('/procedimiento'))
      .forEach((r) => r.flush(null, { status: 404, statusText: 'Not Found' }));
    // Los documentos de la radicación son opcionales para estas pruebas: sin respuesta se entregan vacíos.
    httpMock.match((r) => r.url.endsWith('/documentos')).forEach((r) => r.flush([]));
    httpMock.verify();
  });

  it('muestra lo que el área pidió corregir y habilita la corrección', () => {
    fixture.detectChanges();
    seleccionar(componente, 'REF-001');
    httpMock.expectOne('/api/v1/solicitudes/REF-001').flush(detalle);
    httpMock.expectOne('/api/v1/radicaciones/REF-001/procedimiento').flush({
      procedimiento: {
        codigo: 'REF-001', estadoPortal: 'EN_CORRECCION', estadoWarehouse: 'Pendiente Corrección Documental',
        etiqueta: 'Corrección pendiente', requiereAccion: true,
        correcciones: [{ documento: 'CTL', observacion: 'Debe tener menos de 30 días' }],
        observacion: null, numeroPoliza: null, asesor: null, enviada: true, documentosRequeridos: [], documentos: [],
      },
      eventos: [{ fecha: '2026-10-11T10:00:00-05:00', descripcion: 'El área pidió corregir: CTL' }],
    });
    fixture.detectChanges();
    const html: string = fixture.nativeElement.textContent;
    expect(html).toContain('Qué debes corregir');
    expect(html).toContain('Debe tener menos de 30 días');
    expect(html).toContain('Corrección pendiente');
    // La gestión vive dentro del modal: se abre sola y no hay otra vista a la que ir.
    expect(html).toContain('Enviar corrección');
    expect(fixture.nativeElement.querySelector('app-correccion-panel')).not.toBeNull();

    // Salida siempre disponible: «Ver detalle de la solicitud» vuelve a la ficha y deja reabrir la gestión.
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('app-correccion-panel button'))
      .find((b) => b.textContent?.includes('Ver detalle de la solicitud'))?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-correccion-panel')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Actualizar documentos');
  });

  it('ofrece completar y enviar la radicación que no alcanzó a enviarse al área', () => {
    fixture.detectChanges();
    seleccionar(componente, 'REF-001');
    httpMock.expectOne('/api/v1/solicitudes/REF-001').flush(detalle);
    httpMock.expectOne('/api/v1/radicaciones/REF-001/procedimiento').flush({
      procedimiento: {
        codigo: 'REF-001', estadoPortal: 'RADICADA', estadoWarehouse: null,
        etiqueta: 'Radicada · por enviar', requiereAccion: false, correcciones: [],
        observacion: null, numeroPoliza: null, asesor: null, enviada: false,
        documentosRequeridos: ['cedulaPropietario'], documentos: [],
      },
      eventos: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enviar radicación');
  });

  it('lista cotización, contrato, CTL y cargados, y muestra el documento elegido en la vista previa', () => {
    fixture.detectChanges();
    seleccionar(componente, 'REF-001');
    httpMock.expectOne('/api/v1/solicitudes/REF-001').flush(detalle);
    httpMock.expectOne('/api/v1/solicitudes/REF-001/documentos').flush([
      { tipo: 'cotizacion', clave: 'cotizacion', titulo: 'Cotización', referencia: 'COT-1' },
      { tipo: 'contrato', clave: 'contrato', titulo: 'Contrato de arrendamiento', referencia: 'CTR-1' },
      { tipo: 'ctl', clave: 'certificadoTradicion', titulo: 'Certificado de Tradición y Libertad', referencia: null },
      { tipo: 'cargado', clave: 'cedulaPropietario', titulo: 'Cédula del propietario', referencia: null },
    ]);
    fixture.detectChanges();
    const botones = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.docs__item'));
    ['Cotización', 'Contrato de arrendamiento', 'Certificado de Tradición y Libertad', 'Cédula del propietario']
      .forEach((titulo, i) => expect(botones[i].textContent).toContain(titulo));
    expect(botones).toHaveLength(4);

    botones[1].click();
    httpMock.expectOne('/api/v1/contratos/CTR-1/documento?formato=pdf').flush(new Blob(['%PDF'], { type: 'application/pdf' }));
    botones[2].click();
    httpMock.expectOne('/api/v1/solicitudes/REF-001/documentos/certificadoTradicion').flush(new Blob(['%PDF']));
    botones[0].click();
    httpMock.expectOne('/api/v1/cotizaciones/COT-1/pdf').error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar este documento');
  });

  it('no consulta ni abre el drawer sin referencia', () => {
    // When
    fixture.detectChanges();
    // Then
    httpMock.expectNone('/api/v1/solicitudes/REF-001');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
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
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
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
    fixture.nativeElement.querySelector('.md__cerrar').click();
    fixture.detectChanges();
    // Then
    expect(cerrarSpy).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
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
      const etiqueta = (e: string) => CATALOGOS_PRUEBA.seguimiento.find((i) => i.codigo === e)?.descripcion ?? e;
      const filas = construirFilasDetalle(detalle, etiqueta);
      // Then
      expect(filas.map((f) => f.etiqueta)).toEqual([
        'Referencia',
        'Propietario',
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
