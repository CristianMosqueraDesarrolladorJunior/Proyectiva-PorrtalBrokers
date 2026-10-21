import { proveerCatalogosPrueba } from '../../../../../testing/catalogo-prueba';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { computed, signal } from '@angular/core';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { PerfilService } from '../../../../core/services/perfil.service';
import { RegistroBrokerComponent, mensajeErrorRegistro } from './registro-broker.component';

describe('RegistroBrokerComponent', () => {
  let fixture: ComponentFixture<RegistroBrokerComponent>;
  let authSpy: {
    perfilCompartido: jest.Mock;
    registrarProspecto: jest.Mock;
    login: jest.Mock;
  };
  let routerSpy: { navigate: jest.Mock };
  const perfil = signal({ numeroDocumento: '123456789', telefono: '6017000000', sarlaft: { estado: 'sin_consultar' }, documentos: [] as unknown[] });
  const puedeCompletar = signal(false);
  const perfilSpy = {
    perfil: perfil.asReadonly(),
    puedeCompletarRegistro: computed(() => puedeCompletar()),
    cargar: jest.fn().mockReturnValue(of({})),
    completarRegistro: jest.fn().mockReturnValue(of({})),
  };

  const query = (selector: string): HTMLElement =>
    fixture.nativeElement.querySelector(selector) as HTMLElement;

  const escribir = (id: string, valor: string): void => {
    const input = query(id) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  };

  const boton = (texto: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;

  beforeEach(async () => {
    puedeCompletar.set(false);
    authSpy = {
      perfilCompartido: jest.fn().mockReturnValue(of(null)),
      registrarProspecto: jest.fn().mockReturnValue(of({ radicado: 'BR-123', estado: 'PROSPECTO' })),
      login: jest.fn().mockReturnValue(of({ nombre: 'Prospecto', rol: 'BROKER' })),
    };
    routerSpy = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [RegistroBrokerComponent],
      providers: [
        proveerCatalogosPrueba(),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: PerfilService, useValue: perfilSpy },
              ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroBrokerComponent);
    fixture.detectChanges();
  });

  /** Paso 1 → 2: solo tras «Aceptar». */
  const aceptar = (): void => {
    boton('Aceptar y continuar').click();
    fixture.detectChanges();
  };

  const declarar = (marcado = true, id = '#reg-declaracion-inmobiliaria'): void => {
    const check = query(id) as HTMLInputElement;
    check.checked = marcado;
    check.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  const llenarFormulario = (): void => {
    aceptar();
    escribir('#reg-nombre', 'Prospecto Nuevo');
    escribir('#reg-correo', 'prospecto@ejemplo.com');
    escribir('#reg-telefono', '3001234567');
    escribir('#reg-documento', '123456789');
    escribir('#reg-password', 'Clave-Prospecto1');
    escribir('#reg-password-confirm', 'Clave-Prospecto1');
    const ciudad = query('#reg-ciudad') as HTMLInputElement;
    ciudad.value = 'Bogotá D.C.';
    ciudad.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    declarar();
    declarar(true, '#reg-tratamiento-datos');
  };

  it('Given el registro, When carga, Then empieza en «Bienvenida» con los requisitos y no pide datos todavía', () => {
    expect(query('#registro-titulo').textContent).toContain('Inicia a vender pólizas');
    const texto = fixture.nativeElement.textContent as string;
    ['RUT con código CIIU 6820 o 6810', 'Certificación bancaria', 'Documento de identidad', 'Autorización de pago'].forEach((r) => expect(texto).toContain(r));
    expect(query('#reg-nombre')).toBeNull();
    // Etapas: Bienvenida · Tus datos · Documentos (sin Conocimiento de Cliente).
    const etapas = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.registro-pasos__texto b')).map((e) => e.textContent);
    expect(etapas).toEqual(['Bienvenida', 'Tus datos', 'Documentos']);
  });

  it('Given «Bienvenida», When acepta, Then avanza a «Tus datos» y puede volver atrás', () => {
    aceptar();
    expect(query('#reg-nombre')).not.toBeNull();
    boton('Atrás').click();
    fixture.detectChanges();
    expect(query('#reg-nombre')).toBeNull();
  });

  it('Given «Tus datos» completos, When elige crear cuenta y calificarse después, Then inicia sesión y navega a la app', () => {
    llenarFormulario();
    boton('Crear cuenta y calificarme después').click();
    fixture.detectChanges();

    expect(authSpy.registrarProspecto).toHaveBeenCalledWith(expect.objectContaining({ declaracionInmobiliaria: true, aceptaTratamientoDatos: true }));
    expect(authSpy.login).toHaveBeenCalledWith({ usuario: 'prospecto@ejemplo.com', password: 'Clave-Prospecto1' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app']);
  });

  it('Given el formulario sin declaración, When intenta continuar, Then no crea la cuenta y pide la confirmación', () => {
    llenarFormulario();
    declarar(false);
    expect(boton('Continuar').disabled).toBe(true);
    fixture.componentInstance['formulario'].controls.declaracionInmobiliaria.markAsTouched();
    fixture.detectChanges();
    expect(query('#reg-declaracion-inmobiliaria-error').textContent).toContain('Debes confirmar esta declaración');
    expect(authSpy.registrarProspecto).not.toHaveBeenCalled();
  });

  it('Given que no autoriza el tratamiento de datos, When intenta continuar, Then no crea la cuenta y lo pide', () => {
    llenarFormulario();
    declarar(false, '#reg-tratamiento-datos');
    expect(boton('Continuar').disabled).toBe(true);
    fixture.componentInstance['formulario'].controls.aceptaTratamientoDatos.markAsTouched();
    fixture.detectChanges();
    expect(query('#reg-tratamiento-datos-error').textContent).toContain('tratamiento de tus datos');
  });

  it('Given el formulario, When se muestra, Then las casillas están antes de la contraseña, sin plazos, y la contraseña tiene ojo', () => {
    llenarFormulario();
    const html = fixture.nativeElement.innerHTML as string;
    expect(html.indexOf('reg-declaracion-inmobiliaria')).toBeLessThan(html.indexOf('id="reg-password"'));
    expect(html.indexOf('reg-tratamiento-datos')).toBeLessThan(html.indexOf('id="reg-password"'));
    expect(fixture.nativeElement.textContent).not.toMatch(/último año|días/i);
    const ojo = query('button[aria-label="Mostrar contraseña"]') as HTMLButtonElement;
    ojo.click();
    expect((query('#reg-password') as HTMLInputElement).type).toBe('text');
    expect(ojo.getAttribute('aria-pressed')).toBe('true');
    ojo.click();
    expect((query('#reg-password') as HTMLInputElement).type).toBe('password');
  });

  it('Given «Tus datos» completos, When continúa, Then crea la cuenta y pasa a «Documentos»', () => {
    llenarFormulario();
    expect(boton('Continuar').disabled).toBe(false);
    boton('Continuar').click();
    fixture.detectChanges();

    expect(authSpy.registrarProspecto).toHaveBeenCalled();
    expect(query('#registro-titulo').textContent).toContain('Adjunta tus documentos');
    // Sin los obligatorios no se envía.
    expect(boton('Enviar solicitud de registro').disabled).toBe(true);
  });

  it('Given el formulario de registro, When se muestra, Then no menciona SARLAFT ni Conocimiento de Cliente', () => {
    llenarFormulario();
    expect(fixture.nativeElement.textContent).not.toMatch(/sarlaft|conocimiento de cliente/i);
    expect(query('app-aviso-sarlaft')).toBeNull();
  });

  it('Given «Documentos» completos, When envía, Then muestra la confirmación y «Entendido» lleva al portal', () => {
    llenarFormulario();
    boton('Continuar').click();
    fixture.detectChanges();
    puedeCompletar.set(true);
    fixture.detectChanges();

    boton('Enviar solicitud de registro').click();
    fixture.detectChanges();

    expect(perfilSpy.completarRegistro).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('¡Ya tenemos tus datos!');
    boton('Entendido').click();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app']);
  });
});

describe('mensajeErrorRegistro', () => {
  it('dice qué dato ya está registrado según el campo en conflicto del 409', () => {
    expect(mensajeErrorRegistro({ status: 409, error: { fields: ['cedula'] } })).toContain('número de documento');
    expect(mensajeErrorRegistro({ status: 409, error: { fields: ['correo'] } })).toContain('correo ya está registrado');
    expect(mensajeErrorRegistro({ status: 409, error: { fields: [] } })).toContain('documento o correo');
    expect(mensajeErrorRegistro({ status: 500 })).toBe('No pudimos crear tu cuenta. Intenta de nuevo.');
    expect(mensajeErrorRegistro(undefined)).toBe('No pudimos crear tu cuenta. Intenta de nuevo.');
  });
});
