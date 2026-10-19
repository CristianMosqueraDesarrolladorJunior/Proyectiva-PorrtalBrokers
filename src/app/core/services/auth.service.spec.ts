import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { BorradorRadicacionService } from './borrador-radicacion.service';
import type { RegistroProspectoRequest } from '../models/registro-broker.model';

/** El borrador de radicación de una cuenta no lo ve la siguiente que entra en el mismo navegador. */
describe('AuthService (borrador de radicación por cuenta)', () => {
  let auth: AuthService;
  let borrador: BorradorRadicacionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    borrador = TestBed.inject(BorradorRadicacionService);
    httpMock = TestBed.inject(HttpTestingController);
    borrador.formulario.set({ numeroDocumentoPropietario: '46357750' });
    borrador.contrato.set({ referencia: 'CTR-1' });
  });

  afterEach(() => httpMock.verify());

  it('el login de otra cuenta descarta el borrador', () => {
    auth.login({ usuario: '877388617', password: 'x' } as never).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ nombre: 'Otra', rol: 'BROKER' });
    expect(borrador.formulario()).toBeNull();
    expect(borrador.contrato()).toBeNull();
  });

  it('el registro de una cuenta nueva descarta el borrador', () => {
    auth.registrarProspecto({ documento: '1', nombreCompleto: 'N' } as RegistroProspectoRequest).subscribe();
    httpMock.expectOne('/api/v1/brokers/prospectos').flush({ radicado: 'R', estado: 'PROSPECTO' });
    expect(borrador.formulario()).toBeNull();
  });

  it('el logout descarta el borrador aunque el servidor falle', () => {
    auth.logout().subscribe({ error: () => undefined });
    httpMock.expectOne('/api/v1/auth/logout').flush(null, { status: 500, statusText: 'Error' });
    expect(borrador.formulario()).toBeNull();
  });

  it('rehidratar la misma sesión (recarga) conserva el borrador', () => {
    auth.sesion().subscribe();
    httpMock.expectOne('/api/v1/auth/session').flush({ nombre: 'Misma', rol: 'BROKER' });
    expect(borrador.contrato()).toEqual({ referencia: 'CTR-1' });
  });
});
