import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToggleSwitchComponent } from './toggle-switch.component';

describe('ToggleSwitchComponent', () => {
  let fixture: ComponentFixture<ToggleSwitchComponent>;
  let component: ToggleSwitchComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToggleSwitchComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToggleSwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('expone role="switch" y aria-checked según el estado', () => {
    const el = fixture.nativeElement.querySelector('.toggle-switch') as HTMLElement;
    expect(el.getAttribute('role')).toBe('switch');
    expect(el.getAttribute('aria-checked')).toBe('false');
    // Conmutar por la API pública dispara la detección de cambios (OnPush).
    el.click();
    fixture.detectChanges();
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('conmuta y emite checkedChange al hacer clic', () => {
    // Given
    const emitido: boolean[] = [];
    component.checkedChange.subscribe((v) => emitido.push(v));
    // When
    (fixture.nativeElement.querySelector('.toggle-switch') as HTMLElement).click();
    // Then
    expect(component.checked).toBe(true);
    expect(emitido).toEqual([true]);
  });

  it('no conmuta cuando está deshabilitado', () => {
    // Given
    component.disabled = true;
    fixture.detectChanges();
    // When
    (fixture.nativeElement.querySelector('.toggle-switch') as HTMLElement).click();
    // Then
    expect(component.checked).toBe(false);
  });

  it('implementa ControlValueAccessor (writeValue/registerOnChange)', () => {
    let capturado: boolean | undefined;
    component.registerOnChange((v) => (capturado = v));
    component.writeValue(true);
    expect(component.checked).toBe(true);
    (fixture.nativeElement.querySelector('.toggle-switch') as HTMLElement).click();
    expect(capturado).toBe(false);
  });
});
