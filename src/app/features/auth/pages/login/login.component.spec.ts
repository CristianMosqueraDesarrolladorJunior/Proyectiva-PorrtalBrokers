import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { PerfilBroker } from '../../../../core/models/broker.model';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authSpy: { login: jest.Mock };
  let routerSpy: { navigate: jest.Mock };

  const perfil: PerfilBroker = { nombre: 'Ana Broker', rol: 'broker' };

  const query = (selector: string): HTMLElement =>
    fixture.nativeElement.querySelector(selector) as HTMLElement;

  const escribir = (id: string, valor: string): void => {
    const input = query(id) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  beforeEach(async () => {
    authSpy = { login: jest.fn() };
    routerSpy = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('mantiene el botón de ingreso deshabilitado mientras el formulario es inválido', () => {
    // Given: cédula inválida (menos de 6 dígitos) y contraseña vacía
    escribir('#login-cedula', '123');
    fixture.detectChanges();
    // When
    const boton = query('.boton') as HTMLButtonElement;
    // Then
    expect(boton.disabled).toBe(true);
  });

  it('habilita el botón de ingreso cuando cédula (6-10 dígitos) y contraseña son válidas', () => {
    // Given / When
    escribir('#login-cedula', '1023018112');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    // Then
    const boton = query('.boton') as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
  });

  it('muestra un mensaje de error genérico sin revelar el campo ante credenciales inválidas', () => {
    // Given
    authSpy.login.mockReturnValue(
      throwError(() => ({ status: 401 })),
    );
    escribir('#login-cedula', '1023018112');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    // When
    query('.login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    // Then
    const error = query('.login-error');
    expect(error).toBeTruthy();
    expect(error.textContent).toContain('Cédula o contraseña incorrectas');
    expect(error.textContent?.toLowerCase()).not.toContain('cédula no existe');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('autentica con AuthService y navega al shell tras un login exitoso', () => {
    // Given
    authSpy.login.mockReturnValue(of(perfil));
    escribir('#login-cedula', '1023018112');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    // When
    query('.login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    // Then
    expect(authSpy.login).toHaveBeenCalledWith({
      cedula: '1023018112',
      password: 'secreta',
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app']);
    expect(query('.login-error')).toBeNull();
  });

  it('no invoca a AuthService cuando el formulario es inválido al enviar', () => {
    // Given: sin datos válidos
    // When
    query('.login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    // Then
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('navega a /registro-broker desde el acceso "Me interesa vender pólizas"', () => {
    // Given
    const botones = fixture.nativeElement.querySelectorAll('.boton');
    const botonRegistro = botones[botones.length - 1] as HTMLButtonElement;
    // When
    botonRegistro.click();
    fixture.detectChanges();
    // Then
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/registro-broker']);
  });

  it('muestra el acceso visible al registro de nuevo broker (Req 1.8, 2.1)', () => {
    const footer = query('.login-footer');
    expect(footer.textContent).toContain('¿Nuevo broker?');
    expect(footer.textContent).toContain('Me interesa vender pólizas');
  });
});
