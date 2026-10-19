import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DocumentosService, type RecursoDescargable } from '../../core/services/documentos.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { descargarArchivo } from '../../core/util/descargar-archivo';
import { FeedbackService } from '../../shared/services/feedback/feedback.service';

/** Recurso descargable de la Seccion_Documentos (Req 33.3, 33.4). */
interface RecursoDoc {
  readonly icono: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly id: string;
  readonly categoria: string;
}

/** Sección de documentos agrupada por categoría (Req 33.3). */
interface SeccionDoc {
  readonly id: string;
  readonly titulo: string;
  readonly recursos: readonly RecursoDoc[];
}

/**
 * Seccion_Documentos (Req 33.3, 33.4).
 *
 * Replica fielmente el prototipo: 5 secciones (`doc-section`) con `doc-list` de
 * `doc-item` (ícono + título + subtítulo + botón "↓ PDF" o "↗ Abrir"). Al
 * seleccionar un recurso, inicia su descarga/apertura (Req 33.4).
 */
@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documentos.component.html',
  styleUrl: './documentos.component.scss',
})
export class DocumentosComponent implements OnInit {
  private readonly feedback = inject(FeedbackService);
  private readonly documentosService = inject(DocumentosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recursos = signal<readonly RecursoDescargable[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly descargandoId = signal<string | null>(null);

  protected readonly secciones = computed(() => {
    const categorias = [
      { id: 'formatos-renovacion', titulo: 'Formatos de renovación' },
      { id: 'cumplimiento', titulo: 'Cumplimiento y vinculación' },
      { id: 'contratos', titulo: 'Contratos y formatos del cliente' },
      { id: 'condiciones', titulo: 'Condiciones y comisiones' },
      { id: 'instructivos', titulo: 'Instructivos y guías' },
    ];
    return categorias
      .map((categoria) => ({
        ...categoria,
        recursos: this.recursos()
          .filter((recurso) => recurso.categoria === categoria.id)
          .map((recurso) => this.aRecursoDoc(recurso)),
      }))
      .filter((seccion) => seccion.recursos.length > 0);
  });

  ngOnInit(): void {
    this.documentosService
      .obtenerRecursos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recursos) => {
          this.recursos.set(recursos);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(true);
          this.cargando.set(false);
        },
      });
  }

  private aRecursoDoc(recurso: RecursoDescargable): RecursoDoc {
    return {
      id: recurso.id,
      titulo: recurso.nombre,
      descripcion: recurso.descripcion,
      icono: recurso.icono,
      categoria: recurso.categoria,
    };
  }

  /** Etiqueta del botón según la acción del recurso (↓ PDF / ↗ Abrir). */
  protected etiquetaAccion(recurso: RecursoDoc): string {
    return recurso.categoria === 'instructivos' ? '↗ Abrir' : '↓ PDF';
  }

  /** Descarga el PDF a través del API autenticado del portal (Req 33.4). */
  protected abrir(recurso: RecursoDoc): void {
    this.descargandoId.set(recurso.id);
    this.documentosService
      .descargarRecurso(recurso.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contenido) => {
          const extension = contenido.type.includes('wordprocessingml') ? 'docx' : 'pdf';
          descargarArchivo(contenido, `${recurso.titulo}.${extension}`);
          this.descargandoId.set(null);
        },
        error: () => {
          this.feedback.toast({ variante: 'error', mensaje: 'No fue posible descargar el documento. Intenta nuevamente.' });
          this.descargandoId.set(null);
        },
      });
  }

  /** trackBy de secciones. */
  protected trackSeccion(_i: number, seccion: SeccionDoc): string {
    return seccion.titulo;
  }

  /** trackBy de recursos. */
  protected trackRecurso(_i: number, recurso: RecursoDoc): string {
    return recurso.titulo;
  }
}
