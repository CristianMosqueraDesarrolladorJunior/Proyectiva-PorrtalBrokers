import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepTabsComponent } from './step-tabs.component';

describe('StepTabsComponent', () => {
  let fixture: ComponentFixture<StepTabsComponent>;
  let component: StepTabsComponent;

  const render = (pasoActivo: number, navegable = false): HTMLElement => {
    fixture.componentRef.setInput('pasos', [
      'Datos',
      { etiqueta: 'Precios', descripcion: 'Tarifas' },
      'Confirmación',
    ]);
    fixture.componentRef.setInput('pasoActivo', pasoActivo);
    fixture.componentRef.setInput('navegable', navegable);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepTabsComponent] }).compileComponents();
    fixture = TestBed.createComponent(StepTabsComponent);
    component = fixture.componentInstance;
  });

  it('marca completados, activo y pendientes', () => {
    const el = render(1);
    expect(el.querySelectorAll('.step-tab--completado').length).toBe(1);
    expect(el.querySelectorAll('.step-tab--activo').length).toBe(1);
    expect(el.querySelector('.step-tab--activo')?.getAttribute('aria-current')).toBe('step');
  });

  it('muestra "Paso X de N", la descripción y el avance', () => {
    const el = render(1);
    expect(el.querySelector('.step-tabs__contador')?.textContent).toContain('Paso 2 de 3');
    expect(el.querySelector('.step-tab__descripcion')?.textContent).toContain('Tarifas');
    expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
    expect((el.querySelector('.step-tabs__relleno') as HTMLElement).style.width).toBe('50%');
  });

  it('sin navegable no hay botones', () => {
    const el = render(2);
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('con navegable solo los completados son botones y emiten su índice', () => {
    const el = render(2, true);
    const botones = el.querySelectorAll('button');
    expect(botones.length).toBe(2);
    const emitidos: number[] = [];
    component.pasoSeleccionado.subscribe((i) => emitidos.push(i));
    (botones[0] as HTMLButtonElement).click();
    expect(emitidos).toEqual([0]);
  });

  it('acota un pasoActivo fuera de rango', () => {
    const el = render(9);
    expect(el.querySelector('.step-tabs__contador')?.textContent).toContain('Paso 3 de 3');
  });
});
