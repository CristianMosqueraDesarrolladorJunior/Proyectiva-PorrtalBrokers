import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { PerfilBroker } from '../models/broker.model';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let session: SessionService;
  let router: Router;
  let respuestaSesion: () => Observable<PerfilBroker>;

  const ejecutarGuard = (): Promise<boolean | UrlTree> =>
    firstValueFrom(
      TestBed.runInInjectionContext(() =>
        (authGuard as CanActivateFn)({} as never, { url: '/app/seguimiento' } as never),
      ) as Observable<boolean | UrlTree>,
    );

  beforeEach(() => {
    respuestaSesion = () => throwError(() => new Error('401'));
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: AuthService, useValue: { sesion: () => respuestaSesion() } },
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn(() => ({ __urlTree: true }) as unknown as UrlTree) },
        },
      ],
    });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  it('permite el acceso cuando el Broker está autenticado', async () => {
    // Given
    session.establecerPerfil({ nombre: 'Ana', rol: 'BROKER' });
    // When
    const resultado = await ejecutarGuard();
    // Then
    expect(resultado).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('tras recargar la página entra si la cookie de sesión sigue vigente', async () => {
    // Given: sin perfil en memoria, pero el backend reconoce la cookie
    respuestaSesion = () => of({ nombre: 'Ana', rol: 'BROKER' });
    // When
    const resultado = await ejecutarGuard();
    // Then
    expect(resultado).toBe(true);
  });

  it('redirige a /login cuando no hay sesión', async () => {
    // Given: sesión sin perfil y cookie inválida
    // When
    const resultado = await ejecutarGuard();
    // Then
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(resultado).not.toBe(true);
  });
});
