import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Banner "Herramienta Rápida" tokenizado (Req 24.1, 35.16).
 *
 * Encapsula el patrón `.quick-tool-banner` del prototipo: ícono, etiqueta
 * "HERRAMIENTA RÁPIDA", título/descripción y una acción de acceso directo
 * (por defecto, ir al Cotizador). Todos los estilos se referencian vía
 * Design_Token (Req 25); incluye foco visible y ARIA (Req 27.3).
 *
 * La acción se emite mediante `accion`, dejando la navegación al contenedor.
 *
 * Uso:
 * ```html
 * <app-quick-tool-banner
 *   titulo="Cotiza en segundos la póliza ideal para tu cliente"
 *   descripcion="Calcula primas, coberturas y comisiones al instante."
 *   textoAccion="Ir al cotizador →"
 *   (accion)="irAlCotizador()"
 * ></app-quick-tool-banner>
 * ```
 */
@Component({
  selector: 'app-quick-tool-banner',
  standalone: true,
  templateUrl: './quick-tool-banner.component.html',
  styleUrl: './quick-tool-banner.component.scss',
})
export class QuickToolBannerComponent {
  /** Etiqueta superior del banner. */
  @Input() etiqueta = 'HERRAMIENTA RÁPIDA';

  /** Ícono decorativo del banner (emoji del prototipo). */
  @Input() icono = 'bolt';

  /** Título principal del banner. */
  @Input() titulo = '';

  /** Descripción secundaria del banner. */
  @Input() descripcion: string | null = null;

  /** Etiqueta del botón de acceso directo. */
  @Input() textoAccion = 'Ir al cotizador';

  /** Emite cuando el usuario activa el acceso directo (por defecto, Cotizador). */
  @Output() accion = new EventEmitter<void>();

  /** Notifica la activación del acceso directo al contenedor. */
  onAccion(): void {
    this.accion.emit();
  }
}
