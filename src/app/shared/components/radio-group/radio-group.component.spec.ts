import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpcionRadio, RadioGroupComponent } from './radio-group.component';

describe('RadioGroupComponent', () => {
  let fixture: ComponentFixture<RadioGroupComponent>;
  let component: RadioGroupComponent;

  const opciones: OpcionRadio[] = [
    { valor: 'mismos', etiqueta: 'Mismos valores' },
    { valor: 'ajustes', etiqueta: 'Con ajustes' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RadioGroupComponent] }).compileComponents();
    fixture = TestBed.createComponent(RadioGroupComponent);
    component = fixture.componentInstance;
    component.opciones = opciones;
    component.valor = 'mismos';
    fixture.detectChanges();
  });

  it('renderiza role="radio" con aria-checked en la opción activa', () => {
    const cards = fixture.nativeElement.querySelectorAll('.radio-card');
    expect(cards.length).toBe(2);
    expect(cards[0].getAttribute('aria-checked')).toBe('true');
    expect(cards[1].getAttribute('aria-checked')).toBe('false');
  });

  it('emite valorChange al seleccionar otra opción', () => {
    // Given
    const emitido: string[] = [];
    component.valorChange.subscribe((v) => emitido.push(v));
    // When
    (fixture.nativeElement.querySelectorAll('.radio-card')[1] as HTMLElement).click();
    // Then
    expect(emitido).toEqual(['ajustes']);
    expect(component.valor).toBe('ajustes');
  });

  it('implementa ControlValueAccessor', () => {
    let capturado: string | undefined;
    component.registerOnChange((v) => (capturado = v));
    component.writeValue('ajustes');
    expect(component.valor).toBe('ajustes');
    (fixture.nativeElement.querySelectorAll('.radio-card')[0] as HTMLElement).click();
    expect(capturado).toBe('mismos');
  });

  it('no selecciona cuando está deshabilitado', () => {
    component.disabled = true;
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.radio-card')[1] as HTMLElement).click();
    expect(component.valor).toBe('mismos');
  });
});
