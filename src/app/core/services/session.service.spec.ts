import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { PerfilBroker } from '../models/broker.model';

describe('SessionService', () => {
  let service: SessionService;

  const perfil: PerfilBroker = { nombre: 'Juan Pérez', rol: 'Broker' };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  it('inicia sin perfil y no autenticado', () => {
    // Given / When / Then
    expect(service.perfil()).toBeNull();
    expect(service.autenticado()).toBe(false);
  });

  it('establece el perfil y marca la sesión como autenticada', () => {
    // When
    service.establecerPerfil(perfil);
    // Then
    expect(service.perfil()).toEqual(perfil);
    expect(service.autenticado()).toBe(true);
  });

  it('limpia el perfil y vuelve al estado no autenticado', () => {
    // Given
    service.establecerPerfil(perfil);
    // When
    service.limpiarPerfil();
    // Then
    expect(service.perfil()).toBeNull();
    expect(service.autenticado()).toBe(false);
  });

  it('nunca persiste el perfil ni el token en localStorage/sessionStorage (Req 28.1)', () => {
    // Given
    const localSpy = jest.spyOn(Storage.prototype, 'setItem');
    // When
    service.establecerPerfil(perfil);
    // Then
    expect(localSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    localSpy.mockRestore();
  });
});
