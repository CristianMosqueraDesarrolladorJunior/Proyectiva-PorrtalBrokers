import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ContratoService } from './contrato.service';

describe('ContratoService', () => {
  let servicio: ContratoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ContratoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('Given el botón de PDF, When se descarga, Then pide solo el PDF como archivo individual', () => {
    servicio.descargarDocumento('CTR-1', 'pdf').subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/contratos/CTR-1/documento');
    expect(req.request.params.get('formato')).toBe('pdf');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF'], { type: 'application/pdf' }));
  });

  it('Given el botón de Word, When se descarga, Then pide solo el .docx', () => {
    servicio.descargarDocumento('CTR-1', 'docx').subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/contratos/CTR-1/documento');
    expect(req.request.params.get('formato')).toBe('docx');
    req.flush(new Blob(['PK']));
  });

  it('Given una referencia con caracteres raros, When se descarga, Then se codifica en la URL', () => {
    servicio.descargarDocumento('A/B', 'pdf').subscribe();
    http.expectOne((r) => r.url === '/api/v1/contratos/A%2FB/documento').flush(new Blob());
  });

  it('Given un CTL y la dirección del contrato, When se valida, Then envía el PDF y la dirección como formulario', () => {
    const archivo = new File(['%PDF'], 'ctl.pdf', { type: 'application/pdf' });
    servicio.validarCtl(archivo, '  CL 81B 80 05  ').subscribe();
    const req = http.expectOne('/api/v1/contratos/ctl/validacion');
    const cuerpo = req.request.body as FormData;
    expect(cuerpo.get('archivo')).toBeInstanceOf(File);
    expect(cuerpo.get('direccionContrato')).toBe('CL 81B 80 05');
    req.flush({});
  });

  it('Given que no hay dirección del contrato, When se valida el CTL, Then no la envía', () => {
    servicio.validarCtl(new File(['%PDF'], 'ctl.pdf'), '   ').subscribe();
    const req = http.expectOne('/api/v1/contratos/ctl/validacion');
    expect((req.request.body as FormData).has('direccionContrato')).toBe(false);
    req.flush({});
  });
});
