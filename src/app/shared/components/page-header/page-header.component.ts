import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * PageHeader — encabezado de sección del sistema "Proyectiva Broker Nexus" (stitch).
 *
 * Muestra un eyebrow opcional (con dot), el título de la sección (`headline-xl`),
 * un subtítulo opcional y un slot de acciones a la derecha (proyección de
 * contenido en `[acciones]`). Totalmente tokenizado.
 *
 * Uso:
 * ```html
 * <app-page-header
 *   eyebrow="Resumen de Operaciones"
 *   titulo="Seguimiento y Rendimiento"
 *   subtitulo="Monitorea tus comisiones y KPIs del mes.">
 *   <div acciones><app-boton variante="accent">Cotizador Express</app-boton></div>
 * </app-page-header>
 * ```
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  /** Texto de eyebrow (en mayúsculas, con dot de acento). Opcional. */
  @Input() eyebrow: string | null = null;

  /** `id` del h1, para `aria-labelledby` de la sección anfitriona. */
  @Input() tituloId: string | null = null;

  /** Título principal de la sección. */
  @Input({ required: true }) titulo = '';

  /** Subtítulo descriptivo. Opcional. */
  @Input() subtitulo: string | null = null;
}
