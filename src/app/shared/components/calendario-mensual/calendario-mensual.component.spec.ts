import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CalendarioMensualComponent,
  EventoCalendario,
} from './calendario-mensual.component';

describe('CalendarioMensualComponent', () => {
  let fixture: ComponentFixture<CalendarioMensualComponent>;
  let component: CalendarioMensualComponent;

  // Octubre 2026 comienza en jueves (2026-10-01).
  const eventos: EventoCalendario[] = [
    { fecha: '2026-10-04', titulo: 'Vence póliza AB-100', estado: 'danger' },
    { fecha: '2026-10-04', titulo: 'Renovación pendiente', estado: 'warning' },
    { fecha: '2026-10-15', titulo: 'Estudio aprobado', estado: 'success' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarioMensualComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CalendarioMensualComponent);
    component = fixture.componentInstance;
    component.anio = 2026;
    component.mes = 10;
    component.eventos = eventos;
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('muestra el título del mes en español', () => {
    expect((component as unknown as { tituloMes: string }).tituloMes).toBe('Octubre 2026');
  });

  it('resalta los días con eventos (has-event)', () => {
    const resaltados = fixture.nativeElement.querySelectorAll('.cal-day.has-event');
    // Dos días distintos tienen eventos: 4 y 15.
    expect(resaltados.length).toBe(2);
  });

  it('selecciona por defecto el primer día con eventos y lista sus eventos', () => {
    const eventosDia = (component as unknown as { eventosDelDia: EventoCalendario[] }).eventosDelDia;
    expect(eventosDia.length).toBe(2);
    expect(eventosDia[0].fecha).toBe('2026-10-04');
  });

  it('actualiza la lista al seleccionar otro día con eventos', () => {
    const seleccionar = (
      component as unknown as { seleccionarDia(c: { dia: number | null; fechaIso: string }): void }
    ).seleccionarDia.bind(component);
    seleccionar({ dia: 15, fechaIso: '2026-10-15' });
    const eventosDia = (component as unknown as { eventosDelDia: EventoCalendario[] }).eventosDelDia;
    expect(eventosDia.length).toBe(1);
    expect(eventosDia[0].titulo).toBe('Estudio aprobado');
  });

  it('renderiza una insignia de estado por evento del día', () => {
    const badges = fixture.nativeElement.querySelectorAll('app-badge-estado');
    expect(badges.length).toBe(2);
  });
});
