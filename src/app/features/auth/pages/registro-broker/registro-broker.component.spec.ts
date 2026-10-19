import { proveerCatalogosPrueba } from '../../../../../testing/catalogo-prueba';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { computed, signal } from '@angular/core';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { PerfilService } from '../../../../core/services/perfil.service';
import { DocumentosService } from '../../../../core/services/documentos.service';
import { RegistroBrokerComponent, mensajeErrorRegistro } from './registro-broker.component';

describe('RegistroBrokerComponent', () => {
  let fixture: ComponentFixture<RegistroBrokerComponent>;
  let authSpy: {
    perfilCompartido: jest.Mock;
    registrarProspecto: jest.Mock;
    login: jest.Mock;
  };
  let routerSpy: { navigate: jest.Mock };
  // Pasos 2 y 3 usan los servicios de Mi perfil (la sesión ya está abierta).
  const perfil = signal({ numeroDocumento: '123456789', telefono: '6017000000', sarlaft: { estado: 'sin_consultar' }, documentos: [] as unknown[] });
  const perfilSpy = {
    perfil: perfil.asReadonly(),
    puedeCompletarRegistro: computed(() => false),
    cargar: jest.fn().mockReturnValue(of({})),
    actualizarSarlaft: jest.fn().mockImplementation(() => {
      perfil.update((p) => ({ ...p, sarlaft: { estado: 'vigente' } }));
      return of({});
    }),
  };

  const query = (selector: string): HTMLElement =>
    fixture.nativeElement.querySelector(selector) as HTMLElement;

  const escribir = (id: string, valor: string): void => {
    const input = query(id) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
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
        { provide: DocumentosService, useValue: { descargarRecurso: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroBrokerComponent);
    fixture.detectChanges();
  });

  const llenarFormulario = (): void => {
    escribir('#reg-nombre', 'Prospecto Nuevo');
    escribir('#reg-correo', 'prospecto@ejemplo.com');
    escribir('#reg-telefono', '3001234567');
    escribir('#reg-documento', '123456789');
    escribir('#reg-password', 'Clave-Prospecto1');
    escribir('#reg-password-confirm', 'Clave-Prospecto1');
    const ciudad = query('#reg-ciudad') as HTMLSelectElement;
    ciudad.value = 'Bogotá D.C.';
    ciudad.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  it('crea al prospecto, inicia sesión con Firebase mediante el backend y navega a la app', () => {
    llenarFormulario();
    (query('.registro-acciones--fila .btn-outline') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(authSpy.registrarProspecto).toHaveBeenCalled();
    expect(authSpy.login).toHaveBeenCalledWith({
      usuario: 'prospecto@ejemplo.com',
      password: 'Clave-Prospecto1',
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app']);
  });

  it('continuar como broker crea la cuenta y sigue con documentos; el Conocimiento de Cliente (paso 3) es opcional', () => {
    llenarFormulario();
    (query('.registro-acciones--fila .btn-accent') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(authSpy.registrarProspecto).toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    // Paso 2: documentos, con el formulario de Conocimiento de Cliente como carga opcional.
    expect(query('#registro-titulo').textContent).toContain('Adjunta tus documentos');
    expect(query('app-doc-uploader').textContent).toContain('Formulario de Conocimiento de Cliente');
    // Sin los documentos obligatorios no se continúa.
    expect((query('.registro-acciones .btn-accent') as HTMLButtonElement).disabled).toBe(true);

    // Con el formulario cargado, el paso 3 queda listo (check) aunque no se haya consultado.
    const etapa3 = () => fixture.nativeElement.querySelectorAll('.registro-pasos__item')[2] as HTMLElement;
    expect(etapa3().classList).not.toContain('hecho');
    perfil.update((p) => ({ ...p, sarlaft: { estado: 'fisico' } }));
    fixture.detectChanges();
    expect(etapa3().classList).toContain('hecho');
  });
});

describe('mensajeErrorRegistro', () => {
  it('dice qué dato ya está registrado según el campo en conflicto del 409', () => {
    expect(mensajeErrorRegistro({ status: 409, error: { fields: ['cedula'] } })).toContain('número de documento');
    expect(mensajeErrorRegistro({ status: 409, error: { fields: ['correo'] } })).toContain('correo ya está registrado');
    expect(mensajeErrorRegistro({ status: 409, error: { fields: [] } })).toContain('documento o correo');
    expect(mensajeErrorRegistro({ status: 500 })).toBe('No fue posible crear tu cuenta. Intenta de nuevo.');
    expect(mensajeErrorRegistro(undefined)).toBe('No fue posible crear tu cuenta. Intenta de nuevo.');
  });
});