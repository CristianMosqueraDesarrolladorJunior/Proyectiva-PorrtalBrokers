import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CorreccionService,
  type CorreccionRequest,
  type CorreccionResponse,
} from '../../../../core/services/correccion.service';
import type {
  DocumentoCargado,
  TipoMimePermitido,
} from '../../../../core/models/documento.model';
import {
  LIMITE_TAMANO_GENERAL_BYTES,
  validarDocumento,
  type ReglaValidacionDocumento,
} from '../../../../shared/validation/documento-validacion';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  FormFieldComponent,
  StepperComponent,
  SuccessScreenComponent,
} from '../../../../shared/components';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../../../shared/components/doc-uploader/doc-uploader.component';
import type { TarjetaSeguimiento } from '../../../../shared/components/success-screen/success-screen.component';
import {
  PASOS_CORRECCION,
  PASO_CONFIRMACION,
  PASO_OBSERVACIONES,
  PASO_SUBIR_DOCUMENTO,
  puedeEnviarCorreccion,
} from './correccion-presentacion';

/** Identificador del documento corregido dentro del uploader (Req 32.2). */
const ID_DOCUMENTO_CORREGIDO = 'documentoCorregido';

/**
 * Regla de validación del documento corregido (Req 32.3, 13.1, 13.2):
 * acepta PDF/JPG/PNG con límite general de 10 MB y sin exigencia de vigencia.
 */
const REGLA_DOCUMENTO_CORREGIDO: ReglaValidacionDocumento = {
  mimePermitidos: ['application/pdf', 'image/jpeg', 'image/png'],
  tamanoMaxBytes: LIMITE_TAMANO_GENERAL_BYTES,
  vigenciaMaxDias: null,
};

/** Estado del envío de la corrección para controlar loaders y confirmación (Req 32.6). */
type EstadoEnvioCorreccion = 'inactivo' | 'enviando' | 'exito';

/**
 * CorreccionComponent — Flujo de Corrección de Documentos de 3 pasos (Req 32).
 *
 * Presenta un `StepperComponent` de 3 pasos (Subir documento → Observaciones →
 * Confirmación) y el resumen del trámite (referencia, documento y motivo de
 * corrección) (Req 32.1). El paso 1 ofrece una zona de carga con
 * `DocUploaderComponent` que acepta PDF/JPG/PNG (Req 32.2) y valida MIME/tamaño con
 * la lógica pura reutilizada `validarDocumento` (Req 32.3, 13). El paso 2 permite
 * registrar observaciones adicionales opcionales (Req 32.4). El envío se impide
 * mientras no exista un documento corregido cargado (Req 32.5).
 *
 * Al enviar, `CorreccionService` registra el trámite en el API_Backend
 * (POST /api/v1/correcciones) y el paso 3 muestra una `SuccessScreen` con el número
 * de radicado y el tiempo estimado de revisión (Req 32.6).
 *
 * El registro autoritativo y la revalidación residen en el API_Backend; esta capa
 * valida por UX y muestra los resultados recibidos. Reutiliza los componentes
 * compartidos sin duplicar marcado (Req 24.4, 35.21).
 */
@Component({
  selector: 'app-correccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    StepperComponent,
    DocUploaderComponent,
    FormFieldComponent,
    BotonComponent,
    AlertBannerComponent,
    SuccessScreenComponent,
  ],
  templateUrl: './correccion.component.html',
  styleUrl: './correccion.component.scss',
})
export class CorreccionComponent {
  private readonly correccionService = inject(CorreccionService);

  /** Etiquetas de los pasos del stepper (Req 32.1). */
  protected readonly pasos = PASOS_CORRECCION;

  /** Índices de paso reutilizados en la plantilla (Req 32.1). */
  protected readonly pasoSubir = PASO_SUBIR_DOCUMENTO;
  protected readonly pasoObservaciones = PASO_OBSERVACIONES;
  protected readonly pasoConfirmacion = PASO_CONFIRMACION;

  /** Índice del paso activo (0 = Subir, 1 = Observaciones, 2 = Confirmación). */
  protected readonly pasoActual = signal(PASO_SUBIR_DOCUMENTO);

  // --- Resumen del trámite a subsanar (Req 32.1) ---
  // Estos valores provienen del trámite observado seleccionado por el Broker.
  protected readonly referencia = signal('');
  protected readonly documentoObservado = signal('');
  protected readonly motivoCorreccion = signal('');

  // --- Paso 1: documento corregido (Req 32.2, 32.3) ---
  /** Documento corregido cargado y validado; `null` mientras no haya carga válida. */
  private readonly documentoCorregido = signal<DocumentoCargado | null>(null);

  /** Nombres de archivo cargados, indexados por id, para el uploader (Req 35.7). */
  protected readonly archivosCargados = signal<Readonly<Record<string, string>>>({});

  // --- Paso 2: observaciones adicionales (Req 32.4) ---
  protected readonly observaciones = signal('');

  /** Estado del envío final (inactivo/enviando/éxito) (Req 32.6). */
  protected readonly estadoEnvio = signal<EstadoEnvioCorreccion>('inactivo');

  /** Confirmación de la corrección registrada (radicado, estado, tiempo estimado) (Req 32.6). */
  protected readonly confirmacion = signal<CorreccionResponse | null>(null);

  /** Mensaje de error genérico, sin exponer detalles internos (Req 28.5). */
  protected readonly errorMensaje = signal('');

  /** Regla de presentación del uploader para el documento corregido (Req 35.7, 32.2). */
  protected readonly reglaDocumento: ReglaDocumentoUploader = {
    id: ID_DOCUMENTO_CORREGIDO,
    etiqueta: 'Documento corregido',
    descripcion: 'Formato PDF, JPG o PNG (Máx 10MB)',
    obligatorio: true,
  };

  /** Verdadero si hay un documento corregido válido cargado (Req 32.5). */
  protected readonly documentoCargado = computed(() => this.documentoCorregido() !== null);

  /** Habilitación del envío de la corrección: requiere documento cargado (Req 32.5). */
  protected readonly envioHabilitado = computed(() =>
    puedeEnviarCorreccion(this.documentoCargado()),
  );

  /** Verdadero mientras se envía la solicitud final (Req 32.6). */
  protected readonly enviando = computed(() => this.estadoEnvio() === 'enviando');

  /** Verdadero cuando el envío finalizó con éxito (Req 32.6). */
  protected readonly envioExitoso = computed(() => this.estadoEnvio() === 'exito');

  /** Tarjetas de seguimiento de la pantalla de éxito (radicado y tiempo estimado) (Req 32.6). */
  protected readonly tarjetasConfirmacion = computed<readonly TarjetaSeguimiento[]>(() => {
    const respuesta = this.confirmacion();
    if (respuesta === null) {
      return [];
    }
    return [
      { etiqueta: 'RADICADO', valor: respuesta.radicado },
      { etiqueta: 'ESTADO', valor: respuesta.estado },
      { etiqueta: 'TIEMPO ESTIMADO', valor: respuesta.tiempoEstimadoRevision },
    ];
  });

  /**
   * Procesa el archivo seleccionado del documento corregido: valida MIME/tamaño
   * con la lógica pura reutilizada y actualiza el estado (Req 32.3, 13). El backend
   * revalida siempre (Req 32.6).
   */
  protected onArchivo(evento: ArchivoSeleccionado): void {
    const hoyIso = new Date().toISOString();
    const documento: DocumentoCargado = {
      nombre: evento.archivo.name,
      // El navegador expone el MIME real del archivo; si no es permitido, se rechaza.
      tipoMime: evento.archivo.type as TipoMimePermitido,
      tamanoBytes: evento.archivo.size,
    };
    const resultado = validarDocumento(documento, REGLA_DOCUMENTO_CORREGIDO, hoyIso);

    if (!resultado.valido) {
      this.documentoCorregido.set(null);
      this.archivosCargados.set({});
      this.errorMensaje.set(
        'El documento corregido debe ser PDF, JPG o PNG y no superar 10 MB.',
      );
      return;
    }

    this.errorMensaje.set('');
    this.documentoCorregido.set(documento);
    this.archivosCargados.set({ [ID_DOCUMENTO_CORREGIDO]: documento.nombre });
  }

  /**
   * Avanza del paso "Subir documento" al paso "Observaciones" (Req 32.1).
   * Impide avanzar si aún no se ha cargado un documento corregido (Req 32.5).
   */
  protected avanzarAObservaciones(): void {
    if (!this.documentoCargado()) {
      this.errorMensaje.set('Debes cargar el documento corregido para continuar.');
      return;
    }
    this.errorMensaje.set('');
    this.pasoActual.set(PASO_OBSERVACIONES);
  }

  /** Regresa del paso "Observaciones" al paso "Subir documento" (Req 32.1). */
  protected volverASubirDocumento(): void {
    this.errorMensaje.set('');
    this.pasoActual.set(PASO_SUBIR_DOCUMENTO);
  }

  /**
   * Envía la Corrección_Documento al API_Backend y avanza a la confirmación (Req 32.6).
   * Impide el envío sin un documento corregido cargado (Req 32.5).
   */
  protected enviar(): void {
    const documento = this.documentoCorregido();
    if (documento === null || !this.envioHabilitado()) {
      this.errorMensaje.set('Debes cargar el documento corregido antes de enviar.');
      return;
    }
    this.errorMensaje.set('');

    const observacionesTexto = this.observaciones().trim();
    const request: CorreccionRequest = {
      referencia: this.referencia(),
      documentoCorregido: documento,
      ...(observacionesTexto.length > 0 ? { observaciones: observacionesTexto } : {}),
    };

    this.estadoEnvio.set('enviando');
    this.correccionService.registrar(request).subscribe({
      next: (respuesta) => {
        this.confirmacion.set(respuesta);
        this.estadoEnvio.set('exito');
        this.pasoActual.set(PASO_CONFIRMACION);
      },
      error: () => {
        this.estadoEnvio.set('inactivo');
        this.errorMensaje.set(
          'No fue posible registrar la corrección. Intenta nuevamente.',
        );
      },
    });
  }

  /** Reinicia el flujo para registrar una nueva corrección tras la confirmación (Req 32.6). */
  protected nuevaCorreccion(): void {
    this.documentoCorregido.set(null);
    this.archivosCargados.set({});
    this.observaciones.set('');
    this.confirmacion.set(null);
    this.errorMensaje.set('');
    this.estadoEnvio.set('inactivo');
    this.pasoActual.set(PASO_SUBIR_DOCUMENTO);
  }
}
