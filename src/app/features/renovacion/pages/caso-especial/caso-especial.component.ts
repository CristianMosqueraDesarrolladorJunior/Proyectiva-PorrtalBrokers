import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  RadioGroupComponent,
  SuccessScreenComponent,
} from '../../../../shared/components';
import type { ReglaDocumentoUploader } from '../../../../shared/components/doc-uploader/doc-uploader.component';
import type { OpcionRadio } from '../../../../shared/components/radio-group/radio-group.component';
import type { TarjetaSeguimiento } from '../../../../shared/components/success-screen/success-screen.component';
import type { DocumentoCargado, TipoMimePermitido } from '../../../../core/models/documento.model';
import type {
  CasoEspecialRequest,
  TipoCasoEspecial,
} from '../../../../core/models/renovacion.model';
import { RenovacionService } from '../../../../core/services/renovacion.service';
import {
  validarDocumento,
  type MotivoRechazoDocumento,
} from '../../../../shared/validation/documento-validacion';
import {
  ETIQUETA_TIPO_CASO_ESPECIAL,
  puedeEnviarCasoEspecial,
  REGLA_DOCUMENTO_CASO_ESPECIAL,
  TIPOS_CASO_ESPECIAL,
} from '../../caso-especial-habilitacion';

/** Estado del envío del Caso Especial para controlar loaders y confirmación (Req 23.3). */
type EstadoEnvioCasoEspecial = 'inactivo' | 'enviando' | 'exito';

/** Identificador del documento legal en el uploader (Req 23.1). */
const ID_DOCUMENTO_CASO_ESPECIAL = 'documentoLegal';

/** Mensajes de rechazo del documento legal por motivo tipado (Req 23.2). */
const MENSAJE_RECHAZO: Readonly<Record<MotivoRechazoDocumento, string>> = {
  mime_no_permitido: 'El documento debe estar en formato PDF.',
  extension_no_permitida: 'El documento debe estar en formato PDF.',
  tamano_excedido: 'El documento supera el tamaño máximo permitido de 10 MB.',
  vigencia_requerida: 'El documento no cumple con la vigencia requerida.',
  vigencia_invalida: 'La fecha del documento no es válida.',
  vigencia_excedida: 'El documento supera la vigencia permitida.',
};

/**
 * CasoEspecialComponent — Caso Especial de renovación (Otro Sí / Cesión) (Req 23).
 *
 * Solicita el tipo de trámite del conjunto cerrado definido (Otro Sí / Cesión de
 * contrato), la carga del documento legal en PDF y observaciones opcionales,
 * REUTILIZANDO sin duplicar los Componentes_Compartidos `RadioGroupComponent`,
 * `DocUploaderComponent`, `FormFieldComponent`, `AlertBannerComponent`,
 * `EscaleritaLoaderComponent`, `SuccessScreenComponent` y `BotonComponent`.
 *
 * El documento se valida por UX con la lógica pura `validarDocumento` (MIME,
 * extensión y tamaño según Req 13). La habilitación del envío se decide con
 * `puedeEnviarCasoEspecial`: habilitado si y solo si hay un tipo del conjunto y un
 * documento PDF válido; las observaciones no afectan la habilitación.
 *
 * Al enviar, `RenovacionService` registra el trámite en el API_Backend
 * (`POST /api/v1/renovaciones/casosEspeciales`) y se confirma con
 * `SuccessScreenComponent` mostrando el número de radicado y el estado (Req 23.3).
 * El backend revalida siempre; no hay lógica autoritativa en el frontend.
 */
@Component({
  selector: 'app-caso-especial',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RadioGroupComponent,
    DocUploaderComponent,
    FormFieldComponent,
    BotonComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
    SuccessScreenComponent,
  ],
  templateUrl: './caso-especial.component.html',
  styleUrl: './caso-especial.component.scss',
})
export class CasoEspecialComponent {
  private readonly renovacionService = inject(RenovacionService);

  /** Número de póliza sobre la que se tramita el Caso Especial (Req 23). */
  @Input() numeroPoliza = '';

  /** Opciones de tipo de trámite presentadas como tarjetas de selección (Req 23). */
  protected readonly opcionesTipo: readonly OpcionRadio[] = TIPOS_CASO_ESPECIAL.map((tipo) => ({
    valor: tipo,
    etiqueta: ETIQUETA_TIPO_CASO_ESPECIAL[tipo],
  }));

  /** Regla de presentación del documento legal en el uploader (Req 23.1). */
  protected readonly reglasDocumento: readonly ReglaDocumentoUploader[] = [
    {
      id: ID_DOCUMENTO_CASO_ESPECIAL,
      etiqueta: 'Documento legal del trámite',
      descripcion: 'Formato PDF (Máx 10MB)',
      icono: '📄',
      obligatorio: true,
    },
  ];

  /** Tipo de trámite seleccionado por el Broker (vacío mientras no elige) (Req 23). */
  protected readonly tipo = signal('');

  /** Documento legal cargado y validado (o `undefined` si aún no se carga) (Req 23.1). */
  protected readonly documento = signal<DocumentoCargado | undefined>(undefined);

  /** Observaciones opcionales (Req 23.1). */
  protected readonly observaciones = signal('');

  /** Mensaje de error del documento cuando se rechaza por validación (Req 23.2). */
  protected readonly errorDocumento = signal('');

  /** Indica si el Broker ya intentó enviar (para revelar errores de validación). */
  protected readonly intentoEnvio = signal(false);

  /** Estado del envío (inactivo/enviando/éxito) (Req 23.3). */
  protected readonly estadoEnvio = signal<EstadoEnvioCasoEspecial>('inactivo');

  /** Mensaje de error genérico de envío, sin exponer detalles internos. */
  protected readonly errorEnvio = signal('');

  /** Radicado de confirmación devuelto por el backend (Req 23.3). */
  protected readonly radicado = signal('');

  /** Estado del trámite devuelto por el backend (Req 23.3). */
  protected readonly estado = signal('');

  /** Nombres de archivos cargados por id de documento, para el uploader. */
  protected readonly cargados = computed<Readonly<Record<string, string>>>(() => {
    const doc = this.documento();
    const registro: Record<string, string> = {};
    if (doc) {
      registro[ID_DOCUMENTO_CASO_ESPECIAL] = doc.nombre;
    }
    return registro;
  });

  /** Verdadero si el envío está habilitado: tipo del conjunto + documento PDF válido (Req 23.1, 23.2). */
  protected readonly envioHabilitado = computed(() =>
    puedeEnviarCasoEspecial(this.tipo(), this.documento()),
  );

  /** Verdadero mientras se envía el Caso Especial (bloquea el botón, Req 23.3). */
  protected readonly enviando = computed(() => this.estadoEnvio() === 'enviando');

  /** Verdadero cuando el envío finalizó con éxito (muestra confirmación, Req 23.3). */
  protected readonly envioExitoso = computed(() => this.estadoEnvio() === 'exito');

  /** Mensaje de error del tipo cuando se intenta enviar sin seleccionarlo (Req 23). */
  protected readonly errorTipo = computed(() =>
    this.intentoEnvio() && this.tipo().length === 0
      ? 'Debes seleccionar el tipo de trámite del caso especial'
      : '',
  );

  /** Tarjetas de seguimiento de la pantalla de éxito (radicado y estado) (Req 23.3). */
  protected readonly tarjetas = computed<readonly TarjetaSeguimiento[]>(() => [
    { etiqueta: 'RADICADO', valor: this.radicado() },
    { etiqueta: 'ESTADO', valor: this.estado() },
  ]);

  /**
   * Procesa la selección del documento legal, validándolo por UX (Req 23.2).
   * Convierte el `File` nativo a `DocumentoCargado`, aplica `validarDocumento`
   * (solo PDF, tamaño ≤ 10 MB) y, si es válido, lo conserva; si no, muestra el
   * mensaje de rechazo y limpia el documento.
   */
  protected onArchivo(archivo: File): void {
    this.errorDocumento.set('');
    const documento: DocumentoCargado = {
      nombre: archivo.name,
      tipoMime: archivo.type as TipoMimePermitido,
      tamanoBytes: archivo.size,
    };
    const resultado = validarDocumento(documento, REGLA_DOCUMENTO_CASO_ESPECIAL, '');
    if (!resultado.valido) {
      this.documento.set(undefined);
      this.errorDocumento.set(MENSAJE_RECHAZO[resultado.motivo ?? 'mime_no_permitido']);
      return;
    }
    this.documento.set(documento);
  }

  /**
   * Envía la solicitud de Caso Especial si el tipo y el documento son válidos
   * (Req 23.3). Marca el intento de envío para revelar los errores; si el envío no
   * está habilitado no realiza la solicitud. Al registrarse correctamente, muestra
   * la confirmación con radicado y estado; ante un fallo, muestra un mensaje genérico.
   */
  protected enviar(): void {
    this.intentoEnvio.set(true);
    this.errorEnvio.set('');
    const documento = this.documento();
    if (!this.envioHabilitado() || documento === undefined) {
      return;
    }

    const observaciones = this.observaciones().trim();
    const request: CasoEspecialRequest = {
      numeroPoliza: this.numeroPoliza,
      tipo: this.tipo() as TipoCasoEspecial,
      documentoLegal: documento,
      ...(observaciones.length > 0 ? { observaciones } : {}),
    };

    this.estadoEnvio.set('enviando');
    this.renovacionService.casoEspecial(request).subscribe({
      next: (respuesta) => {
        this.radicado.set(respuesta.radicado);
        this.estado.set(respuesta.estado);
        this.estadoEnvio.set('exito');
      },
      error: () => {
        this.estadoEnvio.set('inactivo');
        this.errorEnvio.set('No fue posible registrar el caso especial. Intenta nuevamente.');
      },
    });
  }
}
