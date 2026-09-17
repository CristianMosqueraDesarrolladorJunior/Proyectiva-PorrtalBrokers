import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepperComponent } from './stepper.component';

describe('StepperComponent', () => {
  let fixture: ComponentFixture<StepperComponent>;
  let component: StepperComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepperComponent] }).compileComponents();
    fixture = TestBed.createComponent(StepperComponent);
    component = fixture.componentInstance;
    component.pasos = ['Datos', 'Precios', 'Confirmación'];
    component.pasoActivo = 1;
    fixture.detectChanges();
  });

  it('clasifica pasos anteriores como done, el actual como active y posteriores como pending', () => {
    expect((component as unknown as { estadoPaso(i: number): string }).estadoPaso(0)).toBe('done');
    expect((component as unknown as { estadoPaso(i: number): string }).estadoPaso(1)).toBe('active');
    expect((component as unknown as { estadoPaso(i: number): string }).estadoPaso(2)).toBe(
      'pending',
    );
  });

  it('marca aria-current="step" en el paso activo', () => {
    const activo = fixture.nativeElement.querySelector('.step.active');
    expect(activo.getAttribute('aria-current')).toBe('step');
  });

  it('aplica las clases done/active en el DOM', () => {
    expect(fixture.nativeElement.querySelectorAll('.step.done').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.step.active').length).toBe(1);
  });
});
