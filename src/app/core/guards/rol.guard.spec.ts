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
    const r = ejecutar('ADMINISTRADOR');
    expect(router.serializeUrl(r as UrlTree)).toBe('/login');
  });

  it('permite el rol autorizado', () => {
    session.establecerPerfil({ nombre: 'Admin', rol: 'ADMINISTRADOR' });
    expect(ejecutar('ADMINISTRADOR', 'COMERCIAL')).toBe(true);
  });

  it('un broker no entra a /admin y un comercial no entra a /app', () => {
    session.establecerPerfil({ nombre: 'Ana', rol: 'BROKER' });
    expect(router.serializeUrl(ejecutar('ADMINISTRADOR', 'COMERCIAL') as UrlTree)).toBe('/app');
    session.establecerPerfil({ nombre: 'Com', rol: 'COMERCIAL', comercialId: 'magda' });
    expect(router.serializeUrl(ejecutar('BROKER') as UrlTree)).toBe('/admin');
    expect(router.serializeUrl(ejecutar('ADMINISTRADOR') as UrlTree)).toBe('/admin');
  });

  it('ruta de inicio por rol', () => {
    expect(rutaInicio('BROKER')).toBe('/app');
    expect(rutaInicio('ADMINISTRADOR')).toBe('/admin');
    expect(rutaInicio('COMERCIAL')).toBe('/admin');
  });
});
