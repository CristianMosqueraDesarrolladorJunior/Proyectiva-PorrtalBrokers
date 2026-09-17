import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab, TabsComponent } from './tabs.component';

describe('TabsComponent', () => {
  let fixture: ComponentFixture<TabsComponent>;
  let component: TabsComponent;

  const tabs: Tab[] = [
    { id: 'natural', etiqueta: 'Persona Natural' },
    { id: 'juridica', etiqueta: 'Persona Jurídica' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabsComponent] }).compileComponents();
    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
    component.tabs = tabs;
    component.activa = 'natural';
    fixture.detectChanges();
  });

  it('renderiza role="tab" con aria-selected en la activa', () => {
    const botones = fixture.nativeElement.querySelectorAll('.tab');
    expect(botones.length).toBe(2);
    expect(botones[0].getAttribute('aria-selected')).toBe('true');
    expect(botones[1].getAttribute('aria-selected')).toBe('false');
  });

  it('emite activaChange al seleccionar otra pestaña', () => {
    // Given
    const emitido: string[] = [];
    component.activaChange.subscribe((id) => emitido.push(id));
    // When
    (fixture.nativeElement.querySelectorAll('.tab')[1] as HTMLButtonElement).click();
    // Then
    expect(emitido).toEqual(['juridica']);
    expect(component.activa).toBe('juridica');
  });

  it('navega con flecha derecha por teclado', () => {
    // Given
    const emitido: string[] = [];
    component.activaChange.subscribe((id) => emitido.push(id));
    // When
    const primera = fixture.nativeElement.querySelectorAll('.tab')[0] as HTMLButtonElement;
    primera.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    // Then
    expect(emitido).toEqual(['juridica']);
  });
});
