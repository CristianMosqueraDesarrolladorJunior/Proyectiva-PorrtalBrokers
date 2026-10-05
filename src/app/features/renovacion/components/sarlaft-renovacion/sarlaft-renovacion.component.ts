import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';

import type { DocumentoCargado } from '../../../../core/models/documento.model';
import type { ResultadoSarlaftRenovacion } from '../../../../core/models/renovacion.model';
import { RenovacionService } from '../../../../core/services/renovacion.service';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  InfoBoxComponent,
} from '../../../../shared/components';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../../../shared/components/doc-uploader/doc-uploader.component';
import { MESES_VIGENCIA_SARLAFT } from '../../gestion-renovacion-flujo';

/**
 * SarlaftRenovacionComponent — validación SARLAFT de cualquier gestión de renovación.
 *
 * Proceso real: toda gestión (física, digital, caso especial, no renovar,
 * corrección) valida SARLAFT antes de enviarse. Al montarse consulta el backend:
 * - `vigente` (menos de 36 meses): muestra el resultado y el botón Continuar,
 *   que emite `vigente` para que el wizard envíe la solicitud.
 * - `no_vigente`: muestra última expedición y tiempo transcurrido, y pide cargar
 *   el SARLAFT actualizado; al cargarlo reconsulta.
 * El backend decide la vigencia; el componente solo presenta.
 */
@Component({
  selector: 'app-sarlaft-renovacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    AlertBannerComponent,
    BotonComponent,
    DocUploaderComponent,
    EscaleritaLoaderComponent,
    InfoBoxComponent,
  ],
  templateUrl: './sarlaft-renovacion.component.html',
  styleUrl: './sarlaft-renovacion.component.scss',
})
export class SarlaftRenovacionComponent implements OnInit {
  private readonly renovacionService = inject(RenovacionService);

  /** Póliza cuya gestión se valida. */
  @Input({ required: true }) numeroPoliza = '';

  /** Texto del botón que continúa la gestión con SARLAFT vigente. */
  @Input() textoContinuar = 'Continuar';

  /** SARLAFT vigente: el wizard puede enviar la solicitud. */
  @Output() readonly vigente = new EventEmitter<ResultadoSarlaftRenovacion>();

  /** El broker abandona la gestión. */
  @Output() readonly cancelar = new EventEmitter<void>();

  protected readonly validando = signal(false);
  protected readonly resultado = signal<ResultadoSarlaftRenovacion | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly archivoActualizado = signal<Readonly<Record<string, string>>>({});
  protected readonly mesesVigencia = MESES_VIGENCIA_SARLAFT;

  /** Regla del cargador del SARLAFT actualizado (salida no vigente). */
  protected readonly reglaActualizacion: readonly ReglaDocumentoUploader[] = [
    {
      id: 'sarlaft-actualizado',
      etiqueta: 'Certificado SARLAFT actualizado',
      descripcion: 'PDF, JPG o PNG · máx. 5 MB',
      obligatorio: true,
    },
  ];

  ngOnInit(): void {
    this.consultar();
  }

  /** Reconsulta adjuntando el SARLAFT actualizado. */
  protected onArchivoActualizado(evento: ArchivoSeleccionado): void {
    this.archivoActualizado.set({ [evento.id]: evento.archivo.name });
    this.consultar({
      nombre: evento.archivo.name,
      tipoMime: evento.archivo.type as DocumentoCargado['tipoMime'],
      tamanoBytes: evento.archivo.size,
    });
  }

  /** Vuelve a intentar tras un error técnico. */
  protected reintentar(): void {
    this.consultar();
  }

  protected continuar(): void {
    const resultado = this.resultado();
    if (resultado?.estado === 'vigente') {
      this.vigente.emit(resultado);
    }
  }

  private consultar(documentoActualizado?: DocumentoCargado): void {
    this.validando.set(true);
    this.error.set(null);
    this.renovacionService
      .validarSarlaft({
        numeroPoliza: this.numeroPoliza,
        ...(documentoActualizado ? { documentoActualizado } : {}),
      })
      .subscribe({
        next: (resultado) => {
          this.resultado.set(resultado);
          this.validando.set(false);
        },
        error: () => {
          this.error.set('No fue posible validar SARLAFT en este momento. Intenta nuevamente.');
          this.validando.set(false);
        },
      });
  }
}
