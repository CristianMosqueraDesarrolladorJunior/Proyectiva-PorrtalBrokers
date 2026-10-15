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
import { documentosRegistroBroker, type TipoDocumentoRegistro } from '../../core/models/registro-broker.model';
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
  fisico: 'Físico en revisión',
  sin_consultar: 'Sin consultar',
};
/** Mensaje tras consultar SARLAFT desde el perfil, según lo que decidió el backend. */
const MENSAJE_SARLAFT: Readonly<Record<EstadoSarlaftPerfil, string>> = {
  vigente: 'Conocimiento de Cliente actualizado: está vigente.',
  por_vencer: 'Tu Conocimiento de Cliente está próximo a vencer. Actualízalo para completar tu registro.',
  vencido: 'Tu Conocimiento de Cliente está desactualizado. Diligencia el formulario de actualización y vuelve a consultar.',
  en_cumplimiento: 'Tu caso pasó a revisión del área de Cumplimiento. Te contactaremos por correo.',
  fisico: 'Cargaste tu SARLAFT físico: queda en revisión del área.',
  sin_consultar: 'No fue posible consultar tu Conocimiento de Cliente. Intenta de nuevo.',
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

  /** Foto del broker (compartida con el sidebar). */
  protected readonly foto = this.miPerfil.foto;
  protected readonly subiendoFoto = signal(false);
  protected readonly errorFoto = signal('');

  protected subirFoto(archivo: File): void {
    this.subiendoFoto.set(true);
    this.miPerfil.subirFoto(archivo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.subiendoFoto.set(false),
      error: (err: unknown) => {
        this.subiendoFoto.set(false);
        this.errorFoto.set(mensajeErrorIntegracion(err));
      },
    });
  }

  protected quitarFoto(): void {
    this.subiendoFoto.set(true);
    this.miPerfil.quitarFoto().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.subiendoFoto.set(false),
      error: (err: unknown) => {
        this.subiendoFoto.set(false);
        this.errorFoto.set(mensajeErrorIntegracion(err));
      },
    });
  }

  /** Carga el perfil real del backend y sincroniza los campos editables. */
  private readonly ruta = inject(ActivatedRoute);

  /** Recorrido guiado de registro (Conocimiento de Cliente → documentos → envío); llega con `?registro=1`. */
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

  /** El paso 1 avanza con el Conocimiento de Cliente consultado; el 2, con los 4 documentos aportados. */
  protected readonly puedeAvanzar = computed(() =>
    this.paso() === 1
      ? this.perfil().sarlaft.estado !== 'sin_consultar'
      : this.paso() === 2
        ? this.perfil().documentos.every((d) => d.estado !== 'pendiente')
        : false,
  );

  /** Primer paso pendiente: sin Conocimiento de Cliente → 1; sin documentos → 2; todo listo → 3. */
  private pasoInicial(): 1 | 2 | 3 {
    const p = this.perfil();
    if (p.sarlaft.estado === 'sin_consultar') return 1;
    return p.documentos.every((d) => d.estado !== 'pendiente') ? 3 : 2;
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
      { titulo: 'Conocimiento de Cliente vigente', detalle: ETIQUETA_SARLAFT[p.sarlaft.estado], hecho: p.sarlaft.estado === 'vigente' },
      { titulo: 'Documentación', detalle: `${this.documentosAportados()} de ${p.documentos.length} aportados`, hecho: docsOk },
      { titulo: 'Broker registrado', detalle: p.fechaRegistro ? `Desde ${this.fecha(p.fechaRegistro)}` : 'Acceso completo y comisiones', hecho: p.estadoCuenta === 'REGISTRADO' },
    ];
  });

  // --- Datos personales (el documento de identidad no se edita) ---
  protected readonly nombre = signal(this.perfil().nombreCompleto);
  protected readonly correo = signal(this.perfil().correo);
  protected readonly telefono = signal(this.perfil().telefono);
  protected readonly ciudad = signal(this.perfil().ciudad);
  protected readonly guardandoDatos = signal(false);
  protected readonly mensajeDatos = signal('');
  protected readonly errorDatos = signal(false);

  protected readonly datosValidos = computed(
    () =>
      esNombreValido(this.nombre()) &&
      esCorreoValido(this.correo()) &&
      esTelefonoValido(this.telefono()),
  );
  protected readonly esNombreInvalido = computed(() => !esNombreValido(this.nombre()));
  protected readonly esCorreoInvalido = computed(() => !esCorreoValido(this.correo()));
  protected readonly esTelefonoInvalido = computed(() => !esTelefonoValido(this.telefono()));
  protected readonly datosCambiados = computed(() => {
    const p = this.perfil();
    return (
      this.nombre() !== p.nombreCompleto ||
      this.correo() !== p.correo ||
      this.telefono() !== p.telefono
    );
  });

  // --- SARLAFT ---
  protected readonly consultandoSarlaft = signal(false);
  protected readonly mensajeSarlaft = signal('');
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
  protected readonly errorDocumento = signal('');
  protected readonly mensajeDocumento = signal('');

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
    return this.documentosRegistro.filter(
      (r) => r.tipo !== 'documentoIdentidad' || !identidadYaCargada,
    ).map((r) => ({ id: r.tipo, etiqueta: r.etiqueta, descripcion: r.descripcion, icono: 'upload_file', obligatorio: true }));
  });

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
    this.perfil().documentos.filter((d) => d.tipo !== 'documentoIdentidad' || !d.archivo),
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
    this.mensajeDatos.set('');
    this.servicio
      .actualizarDatos({
        nombreCompleto: this.nombre().trim(),
        correo: this.correo().trim(),
        telefono: this.telefono(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardandoDatos.set(false);
          this.errorDatos.set(false);
          this.mensajeDatos.set('Tus datos personales se actualizaron.');
        },
        error: () => {
          this.guardandoDatos.set(false);
          this.errorDatos.set(true);
          this.mensajeDatos.set('No pudimos guardar tus datos. Revisa la información e intenta de nuevo.');
        },
      });
  }

  protected descartarDatos(): void {
    const p = this.perfil();
    this.nombre.set(p.nombreCompleto);
    this.correo.set(p.correo);
    this.telefono.set(p.telefono);
    this.mensajeDatos.set('');
  }

  protected actualizarSarlaft(): void {
    if (!this.puedeActualizarSarlaft()) {
      return;
    }
    this.consultandoSarlaft.set(true);
    this.mensajeSarlaft.set('');
    this.servicio
      .actualizarSarlaft()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.consultandoSarlaft.set(false);
          this.mensajeSarlaft.set(MENSAJE_SARLAFT[p.sarlaft.estado]);
        },
        error: () => {
          this.consultandoSarlaft.set(false);
          this.mensajeSarlaft.set('No pudimos consultar tu Conocimiento de Cliente en este momento. Intenta de nuevo más tarde.');
        },
      });
  }

  /** Carga el SARLAFT físico (alternativa al enlace): queda en revisión del área. El backend valida el archivo. */
  protected onSarlaftFisico(evento: ArchivoSeleccionado): void {
    this.mensajeSarlaft.set('');
    this.perfilSarlaftFisico(evento.archivo);
  }

  private perfilSarlaftFisico(archivo: File): void {
    this.servicio
      .cargarSarlaftFisico(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => this.mensajeSarlaft.set(MENSAJE_SARLAFT[p.sarlaft.estado]),
        error: (err: unknown) => this.mensajeSarlaft.set(mensajeErrorIntegracion(err)),
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
      this.errorDocumento.set(
        resultado.motivo === 'vigencia_excedida'
          ? `${regla.etiqueta}: debe tener máximo ${regla.vigenciaMaxDias} días de expedida.`
          : resultado.motivo === 'tamano_excedido'
            ? `${regla.etiqueta}: supera el tamaño máximo (${Math.round(regla.tamanoMaxBytes / 1_048_576)} MB).`
            : `${regla.etiqueta}: formato no permitido. Usa PDF, JPG o PNG.`,
      );
      return;
    }
    this.errorDocumento.set('');
    this.servicio
      .reemplazarDocumento(tipo, evento.archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.mensajeDocumento.set(`${regla.etiqueta} cargado. Queda en revisión del área.`),
        error: (err: unknown) => this.errorDocumento.set(mensajeErrorIntegracion(err)),
      });
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
        },
        error: (err: unknown) => {
          this.registrando.set(false);
          this.confirmarRegistro.set(false);
          this.errorDocumento.set(mensajeErrorIntegracion(err));
        },
      });
  }

}
