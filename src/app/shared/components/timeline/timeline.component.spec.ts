import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HitoTimeline, TimelineComponent } from './timeline.component';

describe('TimelineComponent', () => {
  let fixture: ComponentFixture<TimelineComponent>;
  let component: TimelineComponent;

  const hitos: HitoTimeline[] = [
    { titulo: 'Radicada', fecha: '2026-10-01', completado: true },
    { titulo: 'En estudio', fecha: '2026-10-02', completado: true },
    { titulo: 'Aprobada', fecha: '2026-10-05', completado: false },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TimelineComponent] }).compileComponents();
    fixture = TestBed.createComponent(TimelineComponent);
    component = fixture.componentInstance;
    component.hitos = hitos;
    fixture.detectChanges();
  });

  it('renderiza un ítem por hito', () => {
    const items = fixture.nativeElement.querySelectorAll('.timeline-item');
    expect(items.length).toBe(3);
  });

  it('resalta los hitos completados con la clase modificadora', () => {
    const completados = fixture.nativeElement.querySelectorAll('.timeline-item--done');
    expect(completados.length).toBe(2);
  });

  it('muestra título y fecha de cada hito', () => {
    const primerTitulo = fixture.nativeElement.querySelector('.timeline-item__titulo');
    expect(primerTitulo.textContent).toContain('Radicada');
  });
});
