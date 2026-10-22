import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InfoBoxComponent } from '../info-box/info-box.component';
import { BotonComponent } from '../boton/boton.component';
import { DocumentosService, type RecursoDescargable } from '../../../core/services/documentos.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { descargarArchivo } from '../../../core/util/descargar-archivo';
import { FeedbackService } from '../../services/feedback/feedback.service';

/**
 * Conocimiento de Cliente por formulario. La consulta SARLAFT no está habilitada para el portal: se descarga el
 * formulario oficial (Documentos), se diligencia y firma, y se carga en el mismo paso. Si la persona prefiere, su
 * comercial asignado puede hacer la consulta. Se usa en Mi perfil, Radicación y Renovaciones.
 */
@Component({
  selector: 'app-aviso-sarlaft',
  standalone: true,
  imports: [InfoBoxComponent, BotonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-info-box icono="description">
      <p class="aviso-sarlaft__texto">
        Descarga el formulario de Conocimiento de Cliente (SARLAFT), pide que lo diligencie y firme
        {{ quien() }} y cárgalo aquí. Lo revisamos con los demás documentos.
      </p>
      @if (formularios().length > 0) {
        <div class="aviso-sarlaft__descargas">
          @for (f of formularios(); track f.id) {
            <app-boton variante="outline" icono="download" [disabled]="descargando() === f.id" (clicked)="descargar(f)">
              {{ f.nombre }}
            </app-boton>
          }
        </div>
      }
      <p class="aviso-sarlaft__comercial">
        Si prefieres, {{ comercial() }} puede hacer la consulta por ti: escríbele y te ayuda.
      </p>
    </app-info-box>
  `,
  styles: [
    `
      .aviso-sarlaft__texto,
      .aviso-sarlaft__comercial {
        margin: var(--space-0);
      }
      .aviso-sarlaft__descargas {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin: var(--space-3) var(--space-0);
      }
      .aviso-sarlaft__comercial {
        margin-top: var(--space-2);
      }
    `,
  ],
})
export class AvisoSarlaftComponent {
  private readonly documentos = inject(DocumentosService);
  private readonly perfilService = inject(PerfilService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  /** Quién diligencia y firma el formulario (p. ej. «el propietario», «tú»). */
  readonly quien = input('la persona que firma');

  private readonly recursos = signal<readonly RecursoDescargable[]>([]);
  protected readonly descargando = signal<string | null>(null);

  /** Formularios SARLAFT de la sección Documentos (persona natural y jurídica). */
  protected readonly formularios = computed(() =>
    this.recursos().filter((r) => /sarlaft|conocimiento/i.test(`${r.nombre} ${r.descripcion}`)),
  );

  /** Nombre del comercial asignado a la cuenta, o un genérico si aún no se conoce. */
  protected readonly comercial = computed(() => {
    const nombre = this.perfilService.perfil().comercialAsignado?.trim();
    return nombre ? `tu comercial, ${nombre},` : 'tu asesor comercial';
  });

  constructor() {
    this.documentos
      .obtenerRecursos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.recursos.set(r), error: () => this.recursos.set([]) });
    if (!this.perfilService.perfil().comercialAsignado) {
      this.perfilService.cargar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
    }
  }

  protected descargar(recurso: RecursoDescargable): void {
    this.descargando.set(recurso.id);
    this.documentos
      .descargarRecurso(recurso.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (archivo) => {
          this.descargando.set(null);
          descargarArchivo(archivo, `${recurso.nombre}.pdf`);
        },
        error: () => {
          this.descargando.set(null);
          this.feedback.toast({ variante: 'error', mensaje: 'No pudimos descargar el formulario. Intenta de nuevo.' });
        },
      });
  }
}
