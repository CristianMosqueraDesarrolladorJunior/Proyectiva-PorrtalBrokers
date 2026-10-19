import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { PerfilBroker } from '../../../../core/models/broker.model';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authSpy: { login: jest.Mock; restablecerPassword: jest.Mock };
  let routerSpy: { navigate: jest.Mock };

  const perfil: PerfilBroker = { nombre: 'Ana Broker', rol: 'BROKER' };

  /** Último toast publicado por el login (los mensajes ya no se pintan en el formulario). */
  const ultimoToast = (): string => TestBed.inject(FeedbackService).toasts().at(-1)?.mensaje ?? '';
  const query = (selector: string): HTMLElement =>
    fixture.nativeElement.querySelector(selector) as HTMLElement;

  const escribir = (id: string, valor: string): void => {
    const input = query(id) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  beforeEach(async () => {
    authSpy = { login: jest.fn(), restablecerPassword: jest.fn() };
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
    escribir('#login-usuario', '123');
    fixture.detectChanges();
    // When
    const boton = query('.boton') as HTMLButtonElement;
    // Then
    expect(boton.disabled).toBe(true);
  });

  it('habilita el botón de ingreso cuando cédula (6-10 dígitos) y contraseña son válidas', () => {
    // Given / When
    escribir('#login-usuario', '1023018112');
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
    escribir('#login-usuario', '1023018112');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    // When
    query('.login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    // Then
    expect(ultimoToast()).toContain('Usuario o contraseña incorrectos');
    expect(ultimoToast().toLowerCase()).not.toContain('cédula no existe');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('autentica con AuthService y navega al shell tras un login exitoso', () => {
    // Given
    authSpy.login.mockReturnValue(of(perfil));
    escribir('#login-usuario', '1023018112');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    // When
    query('.login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    // Then
    expect(authSpy.login).toHaveBeenCalledWith({
      usuario: '1023018112',
      password: 'secreta',
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app']);
    expect(TestBed.inject(FeedbackService).toasts()).toHaveLength(0);
  });

  it('lleva a la consola /admin cuando el usuario es Administrador o Comercial', () => {
    authSpy.login.mockReturnValue(of({ nombre: 'Admin', rol: 'ADMINISTRADOR' } as PerfilBroker));
    escribir('#login-usuario', '1000000001');
    escribir('#login-password', 'Admin#2026');
    fixture.detectChanges();
    query('.login-form').dispatchEvent(new Event('submit'));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('habilita el ingreso con un correo válido y lo envía sin espacios en los extremos', () => {
    // Given
    authSpy.login.mockReturnValue(of(perfil));
    escribir('#login-usuario', ' broker.prueba@ejemplo.com ');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    // When
    query('.login-form').dispatchEvent(new Event('submit'));
    // Then
    expect(authSpy.login).toHaveBeenCalledWith({
      usuario: 'broker.prueba@ejemplo.com',
      password: 'secreta',
    });
  });

  it('mantiene deshabilitado el ingreso si el usuario no es cédula ni correo', () => {
    escribir('#login-usuario', 'broker.prueba@');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    expect((query('.boton') as HTMLButtonElement).disabled).toBe(true);
  });

  it('distingue la caída del servicio de ingreso de un error de credenciales', () => {
    authSpy.login.mockReturnValue(throwError(() => ({ status: 503 })));
    escribir('#login-usuario', '1023018112');
    escribir('#login-password', 'secreta');
    fixture.detectChanges();
    query('.login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(ultimoToast()).toContain('No pudimos validar tu ingreso');
  });

  it('solicita el restablecimiento de contraseña y confirma sin revelar si la cuenta existe', () => {
    // Given
    authSpy.restablecerPassword.mockReturnValue(of(undefined));
    escribir('#login-usuario', '1023018112');
    fixture.detectChanges();
    // When
    query('.login-olvido').click();
    fixture.detectChanges();
    // Then
    expect(authSpy.restablecerPassword).toHaveBeenCalledWith('1023018112');
    expect(ultimoToast()).toContain('Si tu cédula o correo están registrados');
  });

  it('pide el usuario antes de solicitar el restablecimiento', () => {
    query('.login-olvido').click();
    fixture.detectChanges();
    expect(authSpy.restablecerPassword).not.toHaveBeenCalled();
    expect(ultimoToast()).toContain('Escribe tu cédula o tu correo');
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
