import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { SessionService } from '../services/session.service';

describe('authGuard', () => {
  let session: SessionService;
  let router: Router;

  const ejecutarGuard = (): boolean | UrlTree =>
    TestBed.runInInjectionContext(() =>
      (authGuard as CanActivateFn)(
        {} as never,
        { url: '/app/seguimiento' } as never,
      ),
    ) as boolean | UrlTree;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn(() => ({ __urlTree: true }) as unknown as UrlTree) },
        },
      ],
    });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  it('permite el acceso cuando el Broker está autenticado', () => {
    // Given
    session.establecerPerfil({ nombre: 'Ana', rol: 'Broker' });
    // When
    const resultado = ejecutarGuard();
    // Then
    expect(resultado).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirige a /login cuando el Broker no está autenticado', () => {
    // Given: sesión sin perfil (estado inicial)
    // When
    const resultado = ejecutarGuard();
    // Then
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(resultado).not.toBe(true);
  });
});
