import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawerDetalleComponent, FilaDetalle } from './drawer-detalle.component';

describe('DrawerDetalleComponent', () => {
  let fixture: ComponentFixture<DrawerDetalleComponent>;
  let component: DrawerDetalleComponent;

  const filas: FilaDetalle[] = [
    { etiqueta: 'Referencia', valor: 'RAD-001' },
    { etiqueta: 'Cliente', valor: 'J*** P***' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerDetalleComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DrawerDetalleComponent);
    component = fixture.componentInstance;
    component.titulo = 'Detalle de solicitud';
    component.filas = filas;
  });

  it('no renderiza el drawer cuando está cerrado', () => {
    component.abierto = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();
    expect(fixture.nativeElement.querySelector('.drawer-overlay')).toBeNull();
  });

  it('renderiza role="dialog" y aria-modal cuando está abierto', () => {
    component.abierto = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('.drawer');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('drawer-titulo');
  });

  it('renderiza las filas de detalle (etiqueta/valor)', () => {
    component.abierto = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.detail-row').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.detail-label').textContent).toContain(
      'Referencia',
    );
  });

  it('emite cerrar al pulsar el overlay', () => {
    component.abierto = true;
    fixture.detectChanges();
    const cerrarSpy = jest.spyOn(component.cerrar, 'emit');
    fixture.nativeElement.querySelector('.drawer-overlay').click();
    expect(cerrarSpy).toHaveBeenCalled();
  });

  it('emite cerrar al pulsar el botón de cierre del encabezado', () => {
    component.abierto = true;
    fixture.detectChanges();
    const cerrarSpy = jest.spyOn(component.cerrar, 'emit');
    fixture.nativeElement.querySelector('.drawer-header__close').click();
    expect(cerrarSpy).toHaveBeenCalled();
  });

  it('emite cerrar al presionar Escape', () => {
    component.abierto = true;
    fixture.detectChanges();
    const cerrarSpy = jest.spyOn(component.cerrar, 'emit');
    const dialog: HTMLElement = fixture.nativeElement.querySelector('.drawer');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cerrarSpy).toHaveBeenCalled();
  });
});
