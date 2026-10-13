import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { PerfilBroker } from '../models/broker.model';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { rolGuard, rutaInicio } from './rol.guard';

describe('rolGuard', () => {
  let session: SessionService;
  let router: Router;
  let respuestaSesion: () => Observable<PerfilBroker>;

  const ejecutar = (...roles: Parameters<typeof rolGuard>): Promise<boolean | UrlTree> =>
    firstValueFrom(
      TestBed.runInInjectionContext(
        () => rolGuard(...roles)({} as never, {} as never) as Observable<boolean | UrlTree>,
      ),
    );

  beforeEach(() => {
    respuestaSesion = () => throwError(() => new Error('401'));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sesion: () => respuestaSesion() } },
      ],
    });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  it('sin sesión (ni en memoria ni en la cookie) redirige a /login', async () => {
    const r = await ejecutar('ADMINISTRADOR');
    expect(router.serializeUrl(r as UrlTree)).toBe('/login');
  });

  it('tras recargar la página rehidrata la sesión vigente desde la cookie', async () => {
    respuestaSesion = () => of({ nombre: 'Admin', rol: 'ADMINISTRADOR' });
    expect(await ejecutar('ADMINISTRADOR')).toBe(true);
  });

  it('permite el rol autorizado', async () => {
    session.establecerPerfil({ nombre: 'Admin', rol: 'ADMINISTRADOR' });
    expect(await ejecutar('ADMINISTRADOR', 'COMERCIAL')).toBe(true);
  });

  it('un broker no entra a /admin y un comercial no entra a /app', async () => {
    session.establecerPerfil({ nombre: 'Ana', rol: 'BROKER' });
    expect(router.serializeUrl((await ejecutar('ADMINISTRADOR', 'COMERCIAL')) as UrlTree)).toBe('/app');
    session.establecerPerfil({ nombre: 'Com', rol: 'COMERCIAL', comercialId: 'magda' });
    expect(router.serializeUrl((await ejecutar('BROKER')) as UrlTree)).toBe('/admin');
    expect(router.serializeUrl((await ejecutar('ADMINISTRADOR')) as UrlTree)).toBe('/admin');
  });

  it('ruta de inicio por rol', () => {
    expect(rutaInicio('BROKER')).toBe('/app');
    expect(rutaInicio('ADMINISTRADOR')).toBe('/admin');
    expect(rutaInicio('COMERCIAL')).toBe('/admin');
  });
});
