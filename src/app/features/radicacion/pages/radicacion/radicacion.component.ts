import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  documentosRequeridosRadicacion,
  type RadicacionRequest,
  type TipoDocumentoIdentidad,
  type TipoDocumentoRadicacion,
  type TipoPersona,
} from '../../../../core/models/radicacion.model';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import {
  REGLAS_DOCUMENTO_RADICACION,
  validarDocumento,
} from '../../../../shared/validation/documento-validacion';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  FormFieldComponent,
  InfoBoxComponent,
  RadioGroupComponent,
  TabsComponent,
  ToggleSwitchComponent,
} from '../../../../shared/components';
import type { OpcionRadio } from '../../../../shared/components/radio-group/radio-group.component';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../../../shared/components/doc-uploader/doc-uploader.component';
import type { Tab } from '../../../../shared/components/tabs/tabs.component';
import {
  DESCRIPCION_DOCUMENTO_RADICACION,
  documentosObligatoriosFaltantes,
  ETIQUETA_DOCUMENTO_RADICACION,
  ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD,
  etiquetasDocumentos,
  puedeEnviarRadicacion,
  TIPOS_DOCUMENTO_IDENTIDAD,
  validarDatosRadicacion,
} from './radicacion-presentacion';

/** Documento opcional que también puede cargarse en la radicación (Req 11.3). */
const DOCUMENTO_OPCIONAL: TipoDocumentoRadicacion = 'contratoArrendamientoFirmado';

/**
 * RadicacionComponent — Sección Radicación del Portal (Req 10, 11, 12).
 *
 * Captura los datos base de la radicación (`RadicacionRequest`: tipo y número de
 * documento del propietario y número de estudio de arrendamiento aprobado, Req 10.1),
 * alterna Persona Natural / Persona Jurídica con `TabsComponent` (Req 10.3, 10.4),
 * permite marcar el caso apoderado y el SARLAFT 4.0 condicional con
 * `ToggleSwitchComponent` (Req 10.2, 12.1, 12.2) y deriva el conjunto de documentos
 * obligatorios con `documentosRequeridosRadicacion()`; los documentos se cargan con
 * `DocUploaderComponent` (Req 11.1, 11.2, 11.3, 12.3).
 *
 * El envío se impide mientras falten documentos obligatorios, indicando los
 * pendientes (Req 11.4); el contrato de arrendamiento firmado es opcional (Req 11.3).
 * El botón "Crear contrato" abre el flujo del Generador_Contrato (Req 11.5). La
 * validación de MIME/tamaño/vigencia es lógica pura reutilizada; el backend revalida
 * siempre (Req 10.5, 13.5) — no hay lógica autoritativa en el frontend.
 *
 * Reutiliza componentes compartidos sin duplicar marcado (Req 24.4, 35.21).
 */
@Component({
  selector: 'app-radicacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TabsComponent,
    ToggleSwitchComponent,
    RadioGroupComponent,
    DocUploaderComponent,
    FormFieldComponent,
    BotonComponent,
    AlertBannerComponent,
    InfoBoxComponent,
  ],
  templateUrl: './radicacion.component.html',
  styleUrl: './radicacion.component.scss',
})
export class RadicacionComponent {
  private readonly radicacionService = inject(RadicacionService);
  private readonly router = inject(Router);

  /** Pestañas de tipo de persona (Persona Natural / Persona Jurídica) (Req 10.3, 10.4). */
  protected readonly tabs: readonly Tab[] = [
    { id: 'natural', etiqueta: 'Persona Natural' },
    { id: 'juridica', etiqueta: 'Persona Jurídica' },
  ];

  /** Opciones del firmante del contrato (Propietario / Apoderado), fiel al prototipo (Req 10.2). */
  protected readonly opcionesFirmante: readonly OpcionRadio[] = [
    { valor: 'propietario', etiqueta: 'Propietario' },
    { valor: 'apoderado', etiqueta: 'Apoderado' },
  ];

  /** Tipos de documento de identidad seleccionables para el propietario (Req 10.1). */
  protected readonly tiposDocumento = TIPOS_DOCUMENTO_IDENTIDAD;

  /** Etiqueta legible de cada tipo de documento de identidad (Req 10.1). */
  protected readonly etiquetaTipoDocumento = ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD;

  // --- Estado de los datos base de la radicación (Req 10.1) ---
  protected readonly tipoDocumentoPropietario = signal<TipoDocumentoIdentidad>('CC');
  protected readonly numeroDocumentoPropietario = signal('');
  protected readonly numeroEstudioArrendamiento = signal('');

  // --- Estado del tipo de persona y opciones condicionales (Req 10.2, 10.3, 12.1) ---
  protected readonly tipoPersona = signal<TipoPersona>('natural');
  protected readonly firmaApoderado = signal(false);
  protected readonly sarlaftRequiereFormulario = signal(false);

  /**
   * Documentos cargados: mapa tipo -> nombre de archivo (para el uploader) y
   * mapa tipo -> resultado de validación (para bloquear inválidos).
   */
  protected readonly archivosCargados = signal<Readonly<Record<string, string>>>({});
  private readonly tiposValidos = signal<ReadonlySet<TipoDocumentoRadicacion>>(new Set());

  /** Mensaje de error de envío (por ejemplo, tras un fallo del backend). */
  protected readonly errorEnvio = signal<string | null>(null);

  /** Radicado devuelto por el backend tras un envío exitoso (Req 10, 11). */
  protected readonly radicado = signal<string | null>(null);

  /** Indicador de envío en curso. */
  protected readonly enviando = signal(false);

  /** Conjunto obligatorio de documentos según la selección actual (Req 11, 12). */
  private readonly obligatorios = computed<readonly TipoDocumentoRadicacion[]>(() =>
    documentosRequeridosRadicacion({
      tipoPersona: this.tipoPersona(),
      firmaApoderado: this.firmaApoderado(),
      sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
    }),
  );

  /** Documentos del apoderado (Poder y Cédula), mostrados en su sección (Req 10.2). */
  private readonly tiposApoderado: readonly TipoDocumentoRadicacion[] = [
    'poderApoderado',
    'cedulaApoderado',
  ];

  /** Reglas del uploader para los documentos del apoderado (Req 10.2). */
  protected readonly reglasApoderado = computed<readonly ReglaDocumentoUploader[]>(() =>
    this.firmaApoderado()
      ? this.tiposApoderado.map((tipo) => this.reglaUploader(tipo, true))
      : [],
  );

  /**
   * Reglas del uploader para los documentos obligatorios por tipo de persona y
   * SARLAFT condicional, EXCLUYENDO los del apoderado (que van en su sección) (Req 35.7).
   */
  protected readonly reglasObligatorias = computed<readonly ReglaDocumentoUploader[]>(() =>
    this.obligatorios()
      .filter((tipo) => !this.tiposApoderado.includes(tipo))
      .map((tipo) => this.reglaUploader(tipo, true)),
  );

  /** Regla del uploader para el contrato de arrendamiento firmado (opcional) (Req 11.3). */
  protected readonly reglaOpcional: ReglaDocumentoUploader = this.reglaUploader(
    DOCUMENTO_OPCIONAL,
    false,
  );

  /** Validez de los datos base de la radicación (Req 10.1). */
  protected readonly datosValidos = computed(
    () =>
      validarDatosRadicacion(
        this.numeroDocumentoPropietario(),
        this.numeroEstudioArrendamiento(),
      ).datosValidos,
  );

  /** Tipos obligatorios que ya tienen un archivo válido cargado. */
  private readonly cargadosValidos = computed<readonly TipoDocumentoRadicacion[]>(() => {
    const validos = this.tiposValidos();
    return this.obligatorios().filter((tipo) => validos.has(tipo));
  });

  /** Documentos obligatorios pendientes de cargar (Req 11.4). */
  protected readonly faltantes = computed(() =>
    documentosObligatoriosFaltantes(
      {
        tipoPersona: this.tipoPersona(),
        firmaApoderado: this.firmaApoderado(),
        sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
      },
      this.cargadosValidos(),
    ),
  );

  /** Etiquetas legibles de los documentos pendientes para el mensaje de UI (Req 11.4). */
  protected readonly etiquetasFaltantes = computed(() =>
    etiquetasDocumentos(this.faltantes()),
  );

  /** Habilitación del envío de la radicación (Req 11.4). */
  protected readonly envioHabilitado = computed(() =>
    puedeEnviarRadicacion(
      {
        tipoPersona: this.tipoPersona(),
        firmaApoderado: this.firmaApoderado(),
        sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
      },
      this.cargadosValidos(),
      this.datosValidos(),
    ),
  );

  /** Solo Persona_Natural ofrece el SARLAFT 4.0 condicional (Req 12.1, 12.3). */
  protected readonly muestraToggleSarlaft = computed(
    () => this.tipoPersona() === 'natural',
  );

  /** Valor del radio de firmante (propietario/apoderado) para el binding. */
  protected readonly firmante = computed(() =>
    this.firmaApoderado() ? 'apoderado' : 'propietario',
  );

  /** Actualiza el estado de apoderado al elegir el firmante del contrato (Req 10.2). */
  protected onCambioFirmante(valor: string): void {
    this.firmaApoderado.set(valor === 'apoderado');
  }

  /** Cambia el tipo de persona al seleccionar una pestaña (Req 10.3, 10.4). */
  protected onCambioTipoPersona(id: string): void {
    const tipo: TipoPersona = id === 'juridica' ? 'juridica' : 'natural';
    this.tipoPersona.set(tipo);
    // El SARLAFT condicional solo aplica a Persona_Natural (Req 12.1, 12.3).
    if (tipo === 'juridica') {
      this.sarlaftRequiereFormulario.set(false);
    }
    this.errorEnvio.set(null);
  }

  /**
   * Procesa un archivo seleccionado para un documento: valida MIME/tamaño/vigencia
   * con la lógica pura reutilizada y actualiza el estado de cargados/validez.
   * El backend revalida siempre (Req 13.5).
   */
  protected onArchivo(evento: ArchivoSeleccionado): void {
    const tipo = evento.id as TipoDocumentoRadicacion;
    const regla = REGLAS_DOCUMENTO_RADICACION[tipo];
    const hoyIso = new Date().toISOString();
    const resultado = validarDocumento(
      {
        nombre: evento.archivo.name,
        // El navegador expone el MIME real del archivo; si no es permitido, se rechaza.
        tipoMime: evento.archivo.type as never,
        tamanoBytes: evento.archivo.size,
        fechaEmision: undefined,
      },
      regla,
      hoyIso,
    );

    if (!resultado.valido) {
      this.errorEnvio.set(
        `El archivo de "${ETIQUETA_DOCUMENTO_RADICACION[tipo]}" no cumple los requisitos de carga.`,
      );
      return;
    }

    this.errorEnvio.set(null);
    this.archivosCargados.update((actual) => ({
      ...actual,
      [tipo]: evento.archivo.name,
    }));
    this.tiposValidos.update((actual) => {
      const siguiente = new Set(actual);
      siguiente.add(tipo);
      return siguiente;
    });
  }

  /** Envía la radicación al backend cuando el envío está habilitado (Req 11.4). */
  protected enviar(): void {
    if (!this.envioHabilitado() || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.errorEnvio.set(null);

    const request: RadicacionRequest = {
      tipoDocumentoPropietario: this.tipoDocumentoPropietario(),
      numeroDocumentoPropietario: this.numeroDocumentoPropietario(),
      numeroEstudioArrendamiento: this.numeroEstudioArrendamiento(),
      tipoPersona: this.tipoPersona(),
      firmaApoderado: this.firmaApoderado(),
      sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
      documentos: [],
    };

    this.radicacionService.radicar(request).subscribe({
      next: (respuesta) => {
        this.radicado.set(respuesta.radicado);
        this.enviando.set(false);
      },
      error: () => {
        this.errorEnvio.set(
          'No se pudo registrar la radicación. Intenta nuevamente en unos minutos.',
        );
        this.enviando.set(false);
      },
    });
  }

  /**
   * Abre el Generador_Contrato de arrendamiento navegando a su ruta (Req 11.5, 30.1).
   */
  protected crearContrato(): void {
    void this.router.navigate(['/app/contrato']);
  }

  /** Construye la regla de presentación del uploader para un documento (Req 35.7). */
  private reglaUploader(
    tipo: TipoDocumentoRadicacion,
    obligatorio: boolean,
  ): ReglaDocumentoUploader {
    return {
      id: tipo,
      etiqueta: ETIQUETA_DOCUMENTO_RADICACION[tipo],
      descripcion: DESCRIPCION_DOCUMENTO_RADICACION[tipo],
      obligatorio,
    };
  }
}
