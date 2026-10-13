import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

import { BotonComponent } from '../boton/boton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

/**
 * Visor de un documento (PDF o imagen) que el portal entrega con sesión como blob. Solo muestra URLs
 * `blob:` creadas aquí mismo (nunca una URL externa) y las libera al cambiar o destruirse.
 */
@Component({
  selector: 'app-visor-archivo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonComponent, EmptyStateComponent, SkeletonComponent],
  template: `
    @if (cargando) {
      <app-skeleton [lineas]="1" [alto]="420" ariaLabel="Cargando documento" />
    } @else if (!url()) {
      <app-empty-state icono="description" titulo="Sin documento" [descripcion]="mensajeVacio" />
    } @else {
      <div class="va">
        @if (esImagen()) {
          <img class="va__imagen" [src]="url()" [alt]="nombre" />
        } @else {
          <iframe class="va__marco" [src]="url()" [title]="nombre"></iframe>
        }
        <div class="va__pie">
          <span class="va__nombre">{{ nombre }}</span>
          <a [href]="url()" [download]="nombre"><app-boton variante="ghost" icono="download">Descargar</app-boton></a>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .va {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .va__marco,
      .va__imagen {
        width: 100%;
        height: 60vh;
        min-height: 360px;
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-lg);
        background: var(--sb-surface-low);
        object-fit: contain;
      }
      .va__pie {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .va__nombre {
        font-size: var(--text-caption);
        color: var(--sb-secondary);
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class VisorArchivoComponent implements OnChanges, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);

  @Input() archivo: Blob | null = null;
  @Input() nombre = 'documento';
  @Input() cargando = false;
  @Input() mensajeVacio = 'Selecciona un documento para verlo aquí.';

  protected readonly url = signal<SafeResourceUrl | null>(null);
  protected readonly esImagen = signal(false);
  private crudo: string | null = null;

  ngOnChanges(): void {
    this.liberar();
    if (this.archivo) {
      this.crudo = URL.createObjectURL(this.archivo);
      this.esImagen.set(this.archivo.type.startsWith('image/'));
      // Solo URLs blob: creadas aquí: confiar en ellas no abre la puerta a contenido externo.
      this.url.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.crudo));
    } else {
      this.url.set(null);
    }
  }

  ngOnDestroy(): void {
    this.liberar();
  }

  private liberar(): void {
    if (this.crudo) {
      URL.revokeObjectURL(this.crudo);
      this.crudo = null;
    }
  }
}
