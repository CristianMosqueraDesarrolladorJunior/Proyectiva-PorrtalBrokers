import { proveerCatalogosPrueba } from '../../../../../testing/catalogo-prueba';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { RegistroBrokerComponent } from './registro-broker.component';

describe('RegistroBrokerComponent', () => {
  let fixture: ComponentFixture<RegistroBrokerComponent>;
  let authSpy: {
    perfilCompartido: jest.Mock;
    registrarProspecto: jest.Mock;
    login: jest.Mock;
  };
  let routerSpy: { navigate: jest.Mock };

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

  it('continuar como broker crea la cuenta, abre la sesión y lleva al perfil (SARLAFT y documentos con sesión)', () => {
    llenarFormulario();
    (query('.registro-acciones--fila .btn-accent') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(authSpy.registrarProspecto).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/perfil']);
  });
});
