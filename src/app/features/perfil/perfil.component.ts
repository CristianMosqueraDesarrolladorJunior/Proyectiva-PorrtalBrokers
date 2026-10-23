import { huellaArchivo, tipoConMismaHuella } from '../../shared/util/huella-archivo';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import {
  type EstadoCuenta,
  type EstadoDocumentoPerfil,
  type EstadoSarlaftPerfil,
} from '../../core/models/cuenta.model';
import { SOLICITUD_REGISTRO_ENVIADA, documentosRegistroBroker, type TipoDocumentoRegistro } from '../../core/models/registro-broker.model';
import { FeedbackService } from '../../shared/services/feedback/feedback.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import type { TipoMimePermitido } from '../../core/models/documento.model';
import { MiPerfilService } from '../../core/services/mi-perfil.service';
import { PerfilService } from '../../core/services/perfil.service';
import {
  AlertBannerComponent,
  FotoPerfilComponent,
  BadgeEstadoComponent,
  BotonComponent,
  DocUploaderComponent,
  FormFieldComponent,
  IconComponent,
  InfoBoxComponent,
  AvisoSarlaftComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  type VarianteBadge,
} from '../../shared/components';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../shared/components/doc-uploader/doc-uploader.component';
import { formatearCop } from '../../shared/util/moneda';
import { mensajeErrorIntegracion } from '../../core/util/errores-integracion';
import { abrirFormularioSarlaft } from '../../core/util/sarlaft-enlace';
import { consultaSarlaftHabilitada } from '../../core/util/sarlaft';
import { reglaDeDocumentoRegistro, validarDocumento } from '../../shared/validation/documento-validacion';
import {
  esCorreoValido,
  esNombreValido,
  esTelefonoValido,
} from '../auth/pages/registro-broker/registro-validacion';

const VARIANTE_DOC: Readonly<Record<EstadoDocumentoPerfil, VarianteBadge>> = {
  aprobado: 'success',
  en_revision: 'info',
  pendiente: 'warning',
};
const ETIQUETA_SARLAFT: Readonly<Record<EstadoSarlaftPerfil, string>> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Desactualizado',
  en_cumplimiento: 'En revisión de Cumplimiento',
  fisico: 'Formulario en revisión',
  sin_consultar: 'Pendiente',
};
/** Mensaje tras consultar SARLAFT desde el perfil, según lo que decidió el backend. */
const MENSAJE_SARLAFT: Readonly<Record<EstadoSarlaftPerfil, string>> = {
  vigente: 'Conocimiento de Cliente actualizado: está vigente.',
  por_vencer: 'Tu Conocimiento de Cliente está próximo a vencer. Actualízalo para completar tu registro.',
  vencido: 'Tu Conocimiento de Cliente está desactualizado. Diligencia el formulario de actualización y vuelve a consultar.',
  en_cumplimiento: 'Tu caso pasó a revisión de Cumplimiento. Te contactaremos por correo.',
  fisico: 'Recibimos tu SARLAFT físico y lo estamos revisando.',
  sin_consultar: 'No pudimos consultar tu Conocimiento de Cliente. Intenta de nuevo.',
};
const VARIANTE_SARLAFT: Readonly<Record<EstadoSarlaftPerfil, VarianteBadge>> = {
  vigente: 'success',
  por_vencer: 'warning',
  vencido: 'danger',
  en_cumplimiento: 'warning',
  fisico: 'info',
  sin_consultar: 'info',
};

/**
 * "Mi perfil" del broker (solo UI, datos mock de `PerfilService`).
 *
 * Muestra el estado de la Cuenta (Prospecto / Broker registrado) con la
 * Matriz_Acceso y el CTA de la Transicion_Registro (spec backend, Req 1 y 3),
 * y permite actualizar datos personales, SARLAFT y documentos. El documento de
 * identidad (tipo, número y archivo) NO se puede modificar desde aquí.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeaderComponent,
    IconComponent,
    BadgeEstadoComponent,
    FotoPerfilComponent,
    FormFieldComponent,
    BotonComponent,
    DocUploaderComponent,
    AlertBannerComponent,
    InfoBoxComponent,
    AvisoSarlaftComponent,
    ModalDialogComponent,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private readonly servicio = inject(PerfilService);
  private readonly catalogo = inject(CatalogoService);
  /** Documentos de legalización (catálogo `documento_legalizacion`). */
  private readonly documentosRegistro = documentosRegistroBroker(this.catalogo.opciones('documento_legalizacion'));
  private readonly destroyRef = inject(DestroyRef);
  private readonly miPerfil = inject(MiPerfilService);
  private readonly feedback = inject(FeedbackService);

  /** Foto del broker (compartida con el sidebar). */
  protected readonly foto = this.miPerfil.foto;
  protected readonly subiendoFoto = signal(false);

  protected subirFoto(archivo: File): void {
    this.subiendoFoto.set(true);
    this.miPerfil.subirFoto(archivo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.subiendoFoto.set(false);
        this.feedback.toast({ variante: 'exito', mensaje: 'Tu foto de perfil se actualizó.' });
      },
      error: (err: unknown) => {
        this.subiendoFoto.set(false);
        this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
      },
    });
  }

  protected quitarFoto(): void {
    this.subiendoFoto.set(true);
    this.miPerfil.quitarFoto().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.subiendoFoto.set(false),
      error: (err: unknown) => {
        this.subiendoFoto.set(false);
        this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
      },
    });
  }

  /** Carga el perfil real del backend y sincroniza los campos editables. */
  private readonly ruta = inject(ActivatedRoute);

  /** Recorrido guiado de registro (documentos → Conocimiento de Cliente, opcional → envío); llega con `?registro=1`. */
  protected readonly guiado = signal(this.ruta.snapshot.queryParamMap.get('registro') === '1');
  protected readonly paso = signal<1 | 2 | 3>(1);

  protected iniciarGuiado(): void {
    this.paso.set(this.pasoInicial());
    this.guiado.set(true);
  }

  protected salirGuiado(): void {
    this.guiado.set(false);
  }

  protected anterior(): void {
    this.paso.update((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3) : p));
  }

  protected siguiente(): void {
    if (this.puedeAvanzar()) this.paso.update((p) => (p < 3 ? ((p + 1) as 1 | 2 | 3) : p));
  }

  /** El paso 1 avanza con los documentos aportados; el 2 (Conocimiento de Cliente) es opcional. */
  protected readonly puedeAvanzar = computed(() =>
    this.paso() === 1 ? this.perfil().documentos.every((d) => d.estado !== 'pendiente') : this.paso() === 2,
  );

  /** Primer paso pendiente: sin documentos → 1; sin Conocimiento de Cliente → 2; todo listo → 3. */
  private pasoInicial(): 1 | 2 | 3 {
    const p = this.perfil();
    if (!p.documentos.every((d) => d.estado !== 'pendiente')) return 1;
    return p.sarlaft.estado === 'sin_consultar' ? 2 : 3;
  }

  ngOnInit(): void {
    this.servicio
      .cargar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        this.nombre.set(p.nombreCompleto);
        this.correo.set(p.correo);
        this.telefono.set(p.telefono);
        this.ciudad.set(p.ciudad);
        this.paso.set(this.pasoInicial());
      });
  }

  protected readonly perfil = this.servicio.perfil;
  protected readonly etiquetaTipoDocumento = this.catalogo.etiquetas('tipo_documento');
  protected readonly etiquetaEstado = this.catalogo.etiquetas('estado_cuenta');
  protected readonly modulosRestringidos = this.catalogo.modulosRestringidos();
  /** Etiqueta del estado del documento (catálogo `estado_documento_registro`; el perfil lo trae en minúscula). */
  protected readonly etiquetaDoc: Readonly<Record<string, string>> = Object.fromEntries(
    this.catalogo.opciones('estado_documento_registro').map((e) => [e.codigo.toLowerCase(), e.descripcion]),
  );
  protected readonly varianteDoc = VARIANTE_DOC;
  protected readonly etiquetaSarlaft = ETIQUETA_SARLAFT;
  /** La consulta SARLAFT no está habilitada: se pide el formulario y no se muestra «Consultar» ni la fecha de consulta. */
  protected readonly consultaSarlaft = consultaSarlaftHabilitada(this.catalogo);
  protected readonly abrirFormularioSarlaft = abrirFormularioSarlaft;
  protected readonly varianteSarlaft = VARIANTE_SARLAFT;
  protected readonly cop = formatearCop;

  protected readonly esProspecto = computed(() => this.perfil().estadoCuenta === 'PROSPECTO');
  protected readonly documentosAportados = this.servicio.documentosAportados;
  protected readonly puedeCompletarRegistro = this.servicio.puedeCompletarRegistro;
  protected readonly totalDocumentos = computed(() => this.perfil().documentos.length);

  /** Pasos del recorrido Prospecto → Broker registrado. */
  protected readonly pasosRegistro = computed(() => {
    const p = this.perfil();
    const docsOk = p.documentos.every((d) => d.estado !== 'pendiente');
    return [
      { titulo: 'Ingreso al portal', detalle: 'Cuenta creada', hecho: true },
      { titulo: 'Documentación', detalle: `${this.documentosAportados()} de ${p.documentos.length} aportados`, hecho: docsOk },
      {
        titulo: 'Conocimiento de Cliente',
        detalle: ETIQUETA_SARLAFT[p.sarlaft.estado],
        hecho: p.sarlaft.estado === 'vigente' || p.sarlaft.estado === 'fisico',
      },
      { titulo: 'Broker registrado', detalle: p.fechaRegistro ? `Desde ${this.fecha(p.fechaRegistro)}` : 'Acceso completo y comisiones', hecho: p.estadoCuenta === 'REGISTRADO' },
    ];
  });

  // --- Datos personales (el documento de identidad no se edita) ---
  protected readonly nombre = signal(this.perfil().nombreCompleto);
  protected readonly correo = signal(this.perfil().correo);
  protected readonly telefono = signal(this.perfil().telefono);
  protected readonly ciudad = signal(this.perfil().ciudad);
  protected readonly guardandoDatos = signal(false);

  protected readonly datosValidos = computed(
    () =>
      (esNombreValido(this.nombre()) || this.nombre() === this.perfil().nombreCompleto) &&
      esCorreoValido(this.correo()) &&
      esTelefonoValido(this.telefono()) &&
      !this.esCiudadInvalida(),
  );
  /** Solo una ciudad del catálogo; la que ya tenía guardada se respeta aunque no esté en la lista. */
  protected readonly esCiudadInvalida = computed(
    () => !this.ciudades.includes(this.ciudad()) && this.ciudad() !== this.perfil().ciudad,
  );
  // Un nombre que ya estaba guardado no se marca en rojo al abrir la pantalla; solo si el usuario lo cambia (LG2).
  protected readonly esNombreInvalido = computed(
    () => !esNombreValido(this.nombre()) && this.nombre() !== this.perfil().nombreCompleto,
  );
  protected readonly esCorreoInvalido = computed(() => !esCorreoValido(this.correo()));
  protected readonly esTelefonoInvalido = computed(() => !esTelefonoValido(this.telefono()));
  protected readonly datosCambiados = computed(() => {
    const p = this.perfil();
    return (
      this.nombre() !== p.nombreCompleto ||
      this.correo() !== p.correo ||
      this.telefono() !== p.telefono ||
      this.ciudad() !== p.ciudad
    );
  });

  /** Ciudades del catálogo para el selector de Mi perfil. */
  protected readonly ciudades = this.catalogo
    .opciones('ciudad')
    .map((c) => c.descripcion)
    .sort((a, b) => a.localeCompare(b, 'es'));

  // --- SARLAFT ---
  protected readonly consultandoSarlaft = signal(false);
  protected readonly puedeActualizarSarlaft = computed(() => !this.consultandoSarlaft());
  /** Celular registrado (últimos 4 dígitos) al que SARLAFT envía el enlace; nulo si no es celular. */
  protected readonly celularEnlace = computed(() => {
    const d = (this.perfil().telefono ?? '').replace(/\D/g, '');
    return /^3\d{9}$/.test(d) ? '··· ' + d.slice(-4) : null;
  });
  protected readonly reglaSarlaftFisico: readonly ReglaDocumentoUploader[] = [
    { id: 'formularioSarlaft', etiqueta: 'SARLAFT físico', descripcion: 'Formulario de Conocimiento de Cliente diligenciado y firmado (PDF, JPG o PNG)', icono: 'upload_file', obligatorio: false },
  ];
  protected readonly cargadoSarlaftFisico = computed<Readonly<Record<string, string>>>(() =>
    this.perfil().sarlaft.fisico ? { formularioSarlaft: this.perfil().sarlaft.fisico as string } : ({} as Record<string, string>),
  );

  // --- Documentos ---

  /** El documento de identidad ya está cargado (tiene archivo): entonces es inmodificable. */
  protected readonly identidadCargada = computed(() => {
    const doc = this.perfil().documentos.find((d) => d.tipo === 'documentoIdentidad');
    return !!doc && !!doc.archivo;
  });

  /**
   * Reglas del uploader. Incluye el documento de identidad SOLO cuando aún no se ha
   * cargado (el broker puede subirlo por primera vez desde aquí); una vez cargado, el
   * documento de identidad deja de ser editable (clave natural).
   */
  protected readonly reglasEditables = computed<readonly ReglaDocumentoUploader[]>(() => {
    const identidadYaCargada = this.identidadCargada();
    // El broker registrado ya no legaliza: desde aquí solo carga su cédula, si aún no la tiene.
    const registrado = !this.esProspecto();
    return this.documentosRegistro.filter(
      (r) => (r.tipo !== 'documentoIdentidad' || !identidadYaCargada) && (!registrado || r.tipo === 'documentoIdentidad'),
    ).map((r) => ({ id: r.tipo, etiqueta: r.etiqueta, descripcion: r.descripcion, icono: 'upload_file', obligatorio: true }));
  });

  // --- Firma de las cuentas de cobro (broker registrado) ---
  protected readonly reglaFirma: readonly ReglaDocumentoUploader[] = [
    { id: 'firma', etiqueta: 'Imagen de tu firma', descripcion: 'Firma en tinta oscura sobre fondo blanco, foto o escaneo (PNG o JPG, máximo 2 MB)', icono: 'draw', obligatorio: false },
  ];
  protected readonly subiendoFirma = signal(false);
  protected readonly urlFirma = computed(() => {
    const f = this.perfil().firma;
    return f ? this.servicio.urlFirma(f.archivoId) : null;
  });
  protected readonly cargadaFirma = computed<Readonly<Record<string, string>>>(() => {
    const f = this.perfil().firma;
    return f ? { firma: f.nombre } : ({} as Record<string, string>);
  });

  protected onFirma(evento: ArchivoSeleccionado): void {
    const archivo = evento.archivo;
    if (!['image/png', 'image/jpeg'].includes(archivo.type) || archivo.size > 2 * 1_048_576) {
      this.feedback.toast({ variante: 'error', mensaje: 'Tu firma debe ser una imagen PNG o JPG de máximo 2 MB.' });
      return;
    }
    this.subiendoFirma.set(true);
    this.servicio
      .cargarFirma(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.subiendoFirma.set(false);
          this.feedback.toast({ variante: 'exito', mensaje: 'Guardamos tu firma. Tus cuentas de cobro saldrán firmadas.' });
        },
        error: (err: unknown) => {
          this.subiendoFirma.set(false);
          this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
        },
      });
  }

  protected readonly cargados = computed<Readonly<Record<string, string>>>(() =>
    Object.fromEntries(this.perfil().documentos.filter((d) => d.archivo).map((d) => [d.tipo, d.archivo])),
  );

  /** Documento de identidad mostrado como bloqueado SOLO cuando ya tiene archivo. */
  protected readonly documentoIdentidad = computed(() => {
    const doc = this.perfil().documentos.find((d) => d.tipo === 'documentoIdentidad');
    return doc && doc.archivo ? doc : undefined;
  });

  protected readonly documentosEditables = computed(() =>
    // La identidad aún sin cargar también es pendiente (antes desaparecía de la lista: 3 de 4).
    // Al broker registrado solo le aplica su cédula (los demás documentos eran de la legalización).
    this.perfil().documentos.filter((d) =>
      (d.tipo !== 'documentoIdentidad' || !d.archivo) && (this.esProspecto() || d.tipo === 'documentoIdentidad')),
  );

  // --- Transición de registro ---
  protected readonly confirmarRegistro = signal(false);
  protected readonly registrando = signal(false);
  protected readonly registroCompletado = signal(false);

  protected etiquetaDocumento(tipo: TipoDocumentoRegistro): string {
    return this.documentosRegistro.find((r) => r.tipo === tipo)?.etiqueta ?? tipo;
  }

  protected fecha(iso: string | null): string {
    if (!iso) return '—';
    // "2026-09-01" es medianoche UTC: se arma en hora local para no mostrar el día anterior en Colombia.
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.exec(iso);
    const d = soloFecha ? new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) : new Date(iso);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected soloDigitos(valor: string): string {
    return valor.replace(/\D/g, '').slice(0, 10);
  }

  protected guardarDatos(): void {
    if (!this.datosValidos() || !this.datosCambiados() || this.guardandoDatos()) {
      return;
    }
    this.guardandoDatos.set(true);
    this.servicio
      .actualizarDatos({
        nombreCompleto: this.nombre().trim(),
        correo: this.correo().trim(),
        telefono: this.telefono(),
        // Una ciudad fuera del catálogo (dato viejo de Cien Cuadras) no se envía: el backend la rechazaría.
        ciudad: this.ciudades.includes(this.ciudad()) ? this.ciudad() : undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardandoDatos.set(false);
          this.feedback.toast({ variante: 'exito', mensaje: 'Tus datos personales se actualizaron.' });
        },
        error: () => {
          this.guardandoDatos.set(false);
          this.feedback.toast({ variante: 'error', mensaje: 'No pudimos guardar tus datos. Revisa la información e intenta de nuevo.' });
        },
      });
  }

  protected descartarDatos(): void {
    const p = this.perfil();
    this.nombre.set(p.nombreCompleto);
    this.correo.set(p.correo);
    this.telefono.set(p.telefono);
  }

  protected actualizarSarlaft(): void {
    if (!this.puedeActualizarSarlaft()) {
      return;
    }
    this.consultandoSarlaft.set(true);
    this.servicio
      .actualizarSarlaft()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.consultandoSarlaft.set(false);
          this.avisarSarlaft(p.sarlaft.estado);
        },
        error: () => {
          this.consultandoSarlaft.set(false);
          this.feedback.error({
            titulo: 'No pudimos consultar',
            mensaje: 'Tu Conocimiento de Cliente no respondió en este momento. Intenta de nuevo o carga el formulario físico.',
            acciones: { cancelar: 'Más tarde', reintentar: 'Reintentar' },
            alResolver: (r) => {
              if (r === 'reintentar') this.actualizarSarlaft();
            },
          });
        },
      });
  }

  /** Carga el SARLAFT físico (alternativa al enlace): queda en revisión del área. El backend valida el archivo. */
  protected onSarlaftFisico(evento: ArchivoSeleccionado): void {
    this.perfilSarlaftFisico(evento.archivo);
  }

  private perfilSarlaftFisico(archivo: File): void {
    this.servicio
      .cargarSarlaftFisico(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => this.avisarSarlaft(p.sarlaft.estado),
        error: (err: unknown) => this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) }),
      });
  }

  /** Valida el archivo con la lógica compartida; el backend revalida siempre. */
  protected onDocumento(evento: ArchivoSeleccionado): void {
    const tipo = evento.id as TipoDocumentoRegistro;
    const regla = this.documentosRegistro.find((r) => r.tipo === tipo);
    // El documento de identidad solo se bloquea cuando YA está cargado; si nunca se
    // cargó, el broker puede subirlo por primera vez desde aquí.
    if (!regla || (tipo === 'documentoIdentidad' && this.identidadCargada())) {
      return;
    }
    const resultado = validarDocumento(
      {
        nombre: evento.archivo.name,
        tipoMime: evento.archivo.type as TipoMimePermitido,
        tamanoBytes: evento.archivo.size,
        fechaEmision: regla.vigenciaMaxDias !== null ? new Date(evento.archivo.lastModified).toISOString() : undefined,
      },
      reglaDeDocumentoRegistro(regla),
      new Date().toISOString(),
    );
    if (!resultado.valido) {
      this.feedback.toast({
        variante: 'error',
        mensaje:
        resultado.motivo === 'vigencia_excedida'
          ? `${regla.etiqueta}: debe tener máximo ${regla.vigenciaMaxDias} días de expedida.`
          : resultado.motivo === 'tamano_excedido'
            ? `${regla.etiqueta}: supera el tamaño máximo (${Math.round(regla.tamanoMaxBytes / 1_048_576)} MB).`
            : `${regla.etiqueta}: formato no permitido. Usa PDF, JPG o PNG.`,
      });
      return;
    }
    void this.cargarSiNoEsRepetido(tipo, regla.etiqueta, evento.archivo);
  }

  /** Huella de cada documento cargado en esta visita: el mismo archivo no sirve para dos documentos (LG4). */
  private readonly huellas = new Map<string, string>();

  private async cargarSiNoEsRepetido(tipo: TipoDocumentoRegistro, etiqueta: string, archivo: File): Promise<void> {
    const huella = await huellaArchivo(archivo);
    const repetido = huella ? tipoConMismaHuella(this.huellas, tipo, huella) : undefined;
    if (repetido) {
      this.feedback.toast({
        variante: 'error',
        mensaje: `Ese archivo ya lo cargaste como ${this.etiquetaDocumento(repetido as TipoDocumentoRegistro)}. Carga el documento que corresponde a ${etiqueta}.`,
      });
      return;
    }
    const subir = () => {
      if (huella) this.huellas.set(tipo, huella);
      this.servicio
        .reemplazarDocumento(tipo, archivo)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.feedback.toast({ variante: 'exito', mensaje: `${etiqueta} cargado. Lo estamos revisando.` }),
          error: (err: unknown) => this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) }),
        });
    };
    // Reemplazar un documento ya aprobado lo devuelve a revisión: se avisa antes (auditoría de producción BP6).
    const actual = this.perfil().documentos.find((d) => d.tipo === tipo);
    if (actual?.estado === 'aprobado') {
      this.feedback.info({
        titulo: `Reemplazar ${etiqueta}`,
        mensaje: 'Este documento ya está aprobado. Si lo reemplazas, volverá a revisión. ¿Quieres continuar?',
        acciones: { confirmar: 'Reemplazar', cancelar: 'Cancelar' },
        alResolver: (r) => {
          if (r === 'confirmar') subir();
        },
      });
      return;
    }
    subir();
  }

  protected completarRegistro(): void {
    if (!this.puedeCompletarRegistro() || this.registrando()) {
      return;
    }
    this.registrando.set(true);
    this.servicio
      .completarRegistro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.registrando.set(false);
          this.confirmarRegistro.set(false);
          this.registroCompletado.set(true);
          this.feedback.exito(SOLICITUD_REGISTRO_ENVIADA);
        },
        error: (err: unknown) => {
          this.registrando.set(false);
          this.confirmarRegistro.set(false);
          this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
        },
      });
  }

  /** Resultado de consultar o cargar el Conocimiento de Cliente: vigente es un momento de éxito. */
  private avisarSarlaft(estado: EstadoSarlaftPerfil): void {
    this.feedback.toast({ variante: estado === 'vigente' ? 'exito' : 'info', mensaje: MENSAJE_SARLAFT[estado] });
  }
}
