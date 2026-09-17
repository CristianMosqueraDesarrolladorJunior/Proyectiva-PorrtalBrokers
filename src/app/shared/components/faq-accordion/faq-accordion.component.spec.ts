import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaqAccordionComponent, PreguntaFrecuente } from './faq-accordion.component';

type FaqInterno = {
  estaAbierta(indice: number): boolean;
  alternar(indice: number): void;
};

describe('FaqAccordionComponent', () => {
  let fixture: ComponentFixture<FaqAccordionComponent>;
  let component: FaqAccordionComponent;

  const preguntas: PreguntaFrecuente[] = [
    { pregunta: '¿Requisitos?', respuesta: 'Estar acreditado como broker activo.' },
    { pregunta: '¿Documentos?', respuesta: 'Cédula y certificado de tradición.' },
    { pregunta: '¿Comisión?', respuesta: '8% sobre prima neta anual.' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FaqAccordionComponent] }).compileComponents();
    fixture = TestBed.createComponent(FaqAccordionComponent);
    component = fixture.componentInstance;
    component.preguntas = preguntas;
    fixture.detectChanges();
  });

  it('inicia con todas las respuestas ocultas', () => {
    const interno = component as unknown as FaqInterno;
    expect(interno.estaAbierta(0)).toBe(false);
    expect(interno.estaAbierta(1)).toBe(false);
    expect(interno.estaAbierta(2)).toBe(false);
  });

  it('muestra y oculta la respuesta de una pregunta al conmutarla (Req 33.6)', () => {
    const interno = component as unknown as FaqInterno;
    interno.alternar(1);
    expect(interno.estaAbierta(1)).toBe(true);
    interno.alternar(1);
    expect(interno.estaAbierta(1)).toBe(false);
  });

  it('conmuta cada respuesta de forma independiente (Property 32)', () => {
    const interno = component as unknown as FaqInterno;
    interno.alternar(0);
    interno.alternar(2);
    expect(interno.estaAbierta(0)).toBe(true);
    expect(interno.estaAbierta(1)).toBe(false);
    expect(interno.estaAbierta(2)).toBe(true);

    // Cerrar la 0 no afecta a la 2.
    interno.alternar(0);
    expect(interno.estaAbierta(0)).toBe(false);
    expect(interno.estaAbierta(2)).toBe(true);
  });

  it('renderiza el panel solo para las respuestas abiertas y marca aria-expanded', () => {
    const primerBoton: HTMLButtonElement = fixture.nativeElement.querySelector('.faq__summary');
    primerBoton.click();
    fixture.detectChanges();
    const paneles = fixture.nativeElement.querySelectorAll('.faq__respuesta');
    expect(paneles.length).toBe(1);
    expect(primerBoton.getAttribute('aria-expanded')).toBe('true');
  });
});
