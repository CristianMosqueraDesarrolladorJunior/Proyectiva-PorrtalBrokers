import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminService } from './admin.service';

/** Acciones de la consola: URL, método, cuerpo y `withCredentials` (backend mockeado). */
describe('AdminService (acciones de la consola)', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reasigna el broker con POST al comercial destino', () => {
    service.asignarComercial('b 1', 'c-1').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/brokers/b%201/comercial');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ comercialId: 'c-1' });
    req.flush({});
  });

  it('cambia el estado del negocio y omite la observación vacía', () => {
    service.cambiarEstadoNegocio('BR-1', 'EXPEDIDA', '  ').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/negocios/BR-1/estado');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'EXPEDIDA', observacion: undefined });
    req.flush({});
  });

  it('cambia el acuerdo de comisión del broker', () => {
    service.cambiarComision('b-1', 25).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/brokers/b-1/comision');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ porcentaje: 25 });
    req.flush({});
  });

  it('lista cuentas de cobro e inducciones con credenciales', () => {
    service.listarCuentasCobro().subscribe();
    service.listarInducciones().subscribe();
    for (const url of ['/api/v1/admin/cuentasCobro', '/api/v1/admin/inducciones']) {
      const req = httpMock.expectOne(url);
      expect(req.request.withCredentials).toBe(true);
      req.flush([]);
    }
  });
});
