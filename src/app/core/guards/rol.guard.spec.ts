import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { SessionService } from '../services/session.service';
import { rolGuard, rutaInicio } from './rol.guard';

describe('rolGuard', () => {
  let session: SessionService;
  let router: Router;

  const ejecutar = (...roles: Parameters<typeof rolGuard>) =>
    TestBed.runInInjectionContext(() => rolGuard(...roles)({} as never, {} as never));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  it('sin sesión redirige a /login', () => {
    const r = ejecutar('Administrador');
    expect(router.serializeUrl(r as UrlTree)).toBe('/login');
  });

  it('permite el rol autorizado', () => {
    session.establecerPerfil({ nombre: 'Admin', rol: 'Administrador' });
    expect(ejecutar('Administrador', 'Comercial')).toBe(true);
  });

  it('un broker no entra a /admin y un comercial no entra a /app', () => {
    session.establecerPerfil({ nombre: 'Ana', rol: 'Broker' });
    expect(router.serializeUrl(ejecutar('Administrador', 'Comercial') as UrlTree)).toBe('/app');
    session.establecerPerfil({ nombre: 'Com', rol: 'Comercial', comercialId: 'magda' });
    expect(router.serializeUrl(ejecutar('Broker') as UrlTree)).toBe('/admin');
    expect(router.serializeUrl(ejecutar('Administrador') as UrlTree)).toBe('/admin');
  });

  it('ruta de inicio por rol', () => {
    expect(rutaInicio('Broker')).toBe('/app');
    expect(rutaInicio('Administrador')).toBe('/admin');
    expect(rutaInicio('Comercial')).toBe('/admin');
  });
});
