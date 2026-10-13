import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LecturaContratoResponse } from '../../../../core/models/contrato.model';
import { ContratoService } from '../../../../core/services/contrato.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BotonComponent,
  CalloutCardComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
} from '../../../../shared/components';
import type { ArchivoSeleccionado, ReglaDocumentoUploader } from '../../../../shared/components';

/** Tamaño máximo aceptado antes de enviar (el backend revalida tipo real y tamaño). */
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Lector de contratos de arrendamiento ya firmados (PDF o foto, incluso escaneado).
 *
 * El archivo va al backend, que lo lee con Gemini en Vertex AI y devuelve una PROPUESTA: lo que se
 * encontró se precarga y lo que no queda vacío y se lista. El broker siempre confirma o corrige.
 * Se reutiliza en Contratos y en la Inducción de renovaciones.
 */
@Component({
  selector: 'app-lector-contrato',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BadgeEstadoComponent,
    BotonComponent,
    CalloutCardComponent,
    DocUploaderComponent,
    EscaleritaLoaderComponent,
  ],
  template: `
    <div class="lc">
      <app-callout-card
        icono="document_scanner"
        etiqueta="Lectura inteligente"
        [titulo]="titulo"
        descripcion="Sube el contrato firmado (PDF o foto, aunque esté escaneado). Leemos las partes, el inmueble y el canon y te los proponemos para que solo confirmes."
        tono="accent"
      />

      <app-doc-uploader
        [reglas]="reglas"
        [cargados]="cargados()"
        [disabled]="leyendo()"
        (archivoSeleccionado)="leer($event)"
      ></app-doc-uploader>

      @if (leyendo()) {
        <app-escalerita-loader texto="Leyendo el contrato… puede tardar unos segundos"></app-escalerita-loader>
      }

      @if (error()) {
        <app-alert-banner variante="error" titulo="No pudimos leer el contrato">{{ error() }}</app-alert-banner>
      }

      @if (lectura(); as l) {
        <app-alert-banner
          [variante]="l.falta.length ? 'warning' : 'success'"
          [titulo]="l.falta.length ? 'Lo encontramos casi todo: revisa lo que falta' : 'Encontramos todos los datos'"
          icono="fact_check"
        >
          <span class="lc__resultado">
            Precargamos {{ encontrados() }} datos en el formulario. Confírmalos antes de continuar.
            @if (l.falta.length) {
              <span class="lc__faltan">
                @for (campo of l.falta; track campo) {
                  <app-badge-estado variante="warning">{{ campo }}</app-badge-estado>
                }
              </span>
            }
          </span>
        </app-alert-banner>
        <div class="lc__acciones">
          <app-boton variante="ghost" icono="restart_alt" (clicked)="reiniciar()">Leer otro contrato</app-boton>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .lc {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .lc__resultado {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .lc__faltan {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }
      .lc__acciones {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class LectorContratoComponent {
  private readonly contratos = inject(ContratoService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() titulo = '¿Ya tienes el contrato firmado?';

  /** Propuesta lista para precargar el formulario del anfitrión. */
  @Output() readonly leido = new EventEmitter<LecturaContratoResponse>();

  /** Archivo válido elegido, se lea o no (la inducción lo adjunta aunque la lectura falle). */
  @Output() readonly archivo = new EventEmitter<File>();

  protected readonly reglas: readonly ReglaDocumentoUploader[] = [
    {
      id: 'contrato',
      etiqueta: 'Contrato de arrendamiento',
      descripcion: 'PDF, JPG o PNG · máximo 10 MB',
      icono: 'description',
    },
  ];

  protected readonly cargados = signal<Readonly<Record<string, string>>>({});
  protected readonly leyendo = signal(false);
  protected readonly error = signal('');
  protected readonly lectura = signal<LecturaContratoResponse | null>(null);

  /** Cuántos campos llegaron con valor (para el mensaje de confirmación). */
  protected readonly encontrados = computed(() => {
    const l = this.lectura();
    if (!l) return 0;
    const contar = (o: object | undefined) =>
      Object.values(o ?? {}).filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length;
    return contar(l.arrendador) + contar(l.arrendatario) + contar(l.deudorSolidario) + contar(l.inmueble) + contar(l.condiciones);
  });

  protected leer(evento: ArchivoSeleccionado): void {
    const archivo = evento.archivo;
    this.error.set('');
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.error.set('El archivo debe ser PDF, JPG o PNG.');
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      this.error.set('El archivo supera los 10 MB. Comprímelo o envía solo las páginas de las partes.');
      return;
    }
    this.cargados.set({ contrato: archivo.name });
    this.archivo.emit(archivo);
    this.leyendo.set(true);
    this.lectura.set(null);
    this.contratos
      .leer(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lectura) => {
          this.leyendo.set(false);
          this.lectura.set(lectura);
          this.leido.emit(lectura);
        },
        error: (err: unknown) => {
          this.leyendo.set(false);
          this.error.set(`${mensajeErrorIntegracion(err)} Si persiste, escribe los datos a mano.`);
        },
      });
  }

  protected reiniciar(): void {
    this.lectura.set(null);
    this.cargados.set({});
    this.error.set('');
  }
}
