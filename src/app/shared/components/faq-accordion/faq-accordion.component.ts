import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Pregunta frecuente con su respuesta (Req 33.6). */
export interface PreguntaFrecuente {
  readonly pregunta: string;
  readonly respuesta: string;
}

/**
 * FaqAccordionComponent — Componente_Compartido de acordeón de preguntas
 * frecuentes (Req 33.6, 35.17, 24.1).
 *
 * Encapsula `faq-list` / `faq` del prototipo, totalmente tokenizado. Recibe la
 * lista de preguntas por `@Input()` y conmuta la visibilidad de la respuesta de
 * cada pregunta de forma INDEPENDIENTE (Property 32): abrir o cerrar una no
 * afecta el estado de las demás.
 *
 * Accesibilidad: cada encabezado es un `button` con `aria-expanded` y
 * `aria-controls`, operable por teclado y con foco visible (Req 27.1, 27.5).
 */
@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq-accordion.component.html',
  styleUrl: './faq-accordion.component.scss',
})
export class FaqAccordionComponent {
  /** Preguntas frecuentes a mostrar en orden. */
  @Input({ required: true }) preguntas: readonly PreguntaFrecuente[] = [];

  /** Conjunto de índices de las respuestas actualmente visibles (abiertas). */
  private readonly abiertas = new Set<number>();

  /** Indica si la respuesta del índice dado está visible. */
  protected estaAbierta(indice: number): boolean {
    return this.abiertas.has(indice);
  }

  /**
   * Conmuta la visibilidad de la respuesta del índice dado, sin alterar el
   * estado de las demás preguntas (Property 32).
   */
  protected alternar(indice: number): void {
    if (this.abiertas.has(indice)) {
      this.abiertas.delete(indice);
      return;
    }
    this.abiertas.add(indice);
  }

  /** trackBy de preguntas para render eficiente. */
  protected trackPregunta(indice: number): number {
    return indice;
  }
}
