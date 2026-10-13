import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Foto de perfil con iniciales de respaldo y acciones "Cambiar foto" / "Quitar". Presentacional:
 * valida tipo (JPG/PNG) y tamaño en el cliente para avisar rápido; el backend valida de nuevo por contenido.
 */
@Component({
  selector: 'app-foto-perfil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="fp">
      <div class="fp__marco" [style.width.px]="tamano" [style.height.px]="tamano">
        @if (foto) {
          <img class="fp__img" [src]="foto" [alt]="'Foto de ' + nombre" />
        } @else {
          <span class="fp__iniciales" [style.font-size.px]="tamano * 0.36" aria-hidden="true">{{ iniciales }}</span>
        }
        @if (editable) {
          <label class="fp__lapiz" [attr.aria-label]="foto ? 'Cambiar foto' : 'Subir foto'">
            <app-icon nombre="photo_camera" [tamano]="16" />
            <input type="file" accept="image/jpeg,image/png" (change)="elegir($event)" [disabled]="cargando" />
          </label>
        }
      </div>
      @if (editable) {
        <div class="fp__acciones">
          <label class="fp__boton">
            <app-icon nombre="upload" [tamano]="16" />
            {{ cargando ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Subir foto' }}
            <input type="file" accept="image/jpeg,image/png" (change)="elegir($event)" [disabled]="cargando" />
          </label>
          @if (foto) {
            <button type="button" class="fp__boton fp__boton--quitar" [disabled]="cargando" (click)="quitar.emit()">
              <app-icon nombre="delete" [tamano]="16" /> Quitar
            </button>
          }
          <small class="fp__ayuda" [class.fp__ayuda--error]="error()">{{ error() ?? 'JPG o PNG, máximo 2 MB.' }}</small>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .fp {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      .fp__marco {
        position: relative;
        flex: none;
        border-radius: var(--radius-full);
        background: linear-gradient(135deg, var(--sb-primary), var(--sb-tertiary));
        padding: 3px;
        box-shadow: var(--sb-shadow-1);
      }
      .fp__img,
      .fp__iniciales {
        width: 100%;
        height: 100%;
        border-radius: var(--radius-full);
        border: 3px solid var(--sb-surface);
        box-sizing: border-box;
      }
      .fp__img {
        display: block;
        object-fit: cover;
        background: var(--sb-surface);
      }
      .fp__iniciales {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--sb-primary-fixed);
        color: var(--sb-on-primary-fixed);
        font-family: var(--font-family-heading);
        font-weight: var(--font-weight-bold);
      }
      .fp__lapiz {
        position: absolute;
        right: 2px;
        bottom: 2px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: var(--radius-full);
        background: var(--sb-slate);
        color: var(--sb-on-slate);
        border: 2px solid var(--sb-surface);
        cursor: pointer;
      }
      .fp__lapiz:focus-within,
      .fp__boton:focus-within {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: 2px;
      }
      input[type='file'] {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        overflow: hidden;
      }
      .fp__acciones {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2);
      }
      .fp__boton {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-full);
        background: var(--sb-surface);
        color: var(--sb-on-surface);
        font: inherit;
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
      }
      .fp__boton:hover {
        background: var(--sb-surface-low);
      }
      .fp__boton--quitar {
        color: var(--sb-error);
      }
      .fp__ayuda {
        flex-basis: 100%;
        font-size: var(--text-caption);
        color: var(--sb-secondary);
      }
      .fp__ayuda--error {
        color: var(--sb-error);
      }
    `,
  ],
})
export class FotoPerfilComponent {
  @Input() foto: string | null = null;
  @Input({ required: true }) nombre = '';
  @Input() tamano = 96;
  @Input() editable = true;
  @Input() cargando = false;
  @Output() readonly elegida = new EventEmitter<File>();
  @Output() readonly quitar = new EventEmitter<void>();

  protected readonly error = signal<string | null>(null);

  protected get iniciales(): string {
    const partes = this.nombre.trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.charAt(0) ?? '') + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '')).toUpperCase();
  }

  protected elegir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) {
      this.error.set('La foto debe ser JPG o PNG.');
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      this.error.set('La foto supera 2 MB.');
      return;
    }
    this.error.set(null);
    this.elegida.emit(archivo);
  }
}
