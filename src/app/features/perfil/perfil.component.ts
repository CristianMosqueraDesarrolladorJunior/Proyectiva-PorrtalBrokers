import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  ETIQUETA_ESTADO_CUENTA,
  MODULOS_RESTRINGIDOS,
  type EstadoCuenta,
  type EstadoDocumentoPerfil,
  type EstadoSarlaftPerfil,
} from '../../core/models/cuenta.model';
import { DOCUMENTOS_REGISTRO_BROKER, type TipoDocumentoRegistro } from '../../core/models/registro-broker.model';
import type { TipoMimePermitido } from '../../core/models/documento.model';
import { PerfilService } from '../../core/services/perfil.service';
import {
  AlertBannerComponent,
  AvatarInitialsComponent,
  BadgeEstadoComponent,
  BotonComponent,
  DocUploaderComponent,
  FormFieldComponent,
  IconComponent,
  InfoBoxComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  SegmentedControlComponent,
  type OpcionSegmentada,
  type VarianteBadge,
} from '../../shared/components';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../shared/components/doc-uploader/doc-uploader.component';
import { formatearCop } from '../../shared/util/moneda';
import { reglaDeDocumentoRegistro, validarDocumento } from '../../shared/validation/documento-validacion';
import { ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD } from '../radicacion/pages/radicacion/radicacion-presentacion';
import {
  CIUDADES_PERMITIDAS,
  esCiudadValida,
  esCorreoValido,
  esFechaExpedicionValida,
  esNombreValido,
  esTelefonoValido,
} from '../auth/pages/registro-broker/registro-validacion';

const ETIQUETA_DOC: Readonly<Record<EstadoDocumentoPerfil, string>> = {
  aprobado: 'Aprobado',
  en_revision: 'En revisión',
  pendiente: 'Pendiente',
};
const VARIANTE_DOC: Readonly<Record<EstadoDocumentoPerfil, VarianteBadge>> = {
  aprobado: 'success',
  en_revision: 'info',
  pendiente: 'warning',
};
const ETIQUETA_SARLAFT: Readonly<Record<EstadoSarlaftPerfil, string>> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  sin_consultar: 'Sin consultar',
};
const VARIANTE_SARLAFT: Readonly<Record<EstadoSarlaftPerfil, VarianteBadge>> = {
  vigente: 'success',
  por_vencer: 'warning',
  vencido: 'danger',
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
    AvatarInitialsComponent,
    FormFieldComponent,
    BotonComponent,
    DocUploaderComponent,
    AlertBannerComponent,
    InfoBoxComponent,
    ModalDialogComponent,
    SegmentedControlComponent,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent {
  private readonly servicio = inject(PerfilService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly perfil = this.servicio.perfil;
  protected readonly modoDesarrollo = isDevMode();
  protected readonly ciudades = CIUDADES_PERMITIDAS;
  protected readonly etiquetaTipoDocumento = ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_CUENTA;
  protected readonly modulosRestringidos = MODULOS_RESTRINGIDOS;
  protected readonly etiquetaDoc = ETIQUETA_DOC;
  protected readonly varianteDoc = VARIANTE_DOC;
  protected readonly etiquetaSarlaft = ETIQUETA_SARLAFT;
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
      { titulo: 'SARLAFT vigente', detalle: ETIQUETA_SARLAFT[p.sarlaft.estado], hecho: p.sarlaft.estado === 'vigente' },
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

  protected readonly datosValidos = computed(
    () =>
      esNombreValido(this.nombre()) &&
      esCorreoValido(this.correo()) &&
      esTelefonoValido(this.telefono()) &&
      esCiudadValida(this.ciudad()),
  );
  protected readonly esNombreInvalido = computed(() => !esNombreValido(this.nombre()));
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

  // --- SARLAFT ---
  protected readonly fechaExpedicion = signal(this.perfil().sarlaft.fechaExpedicion ?? '');
  protected readonly consultandoSarlaft = signal(false);
  protected readonly mensajeSarlaft = signal('');
  protected readonly puedeActualizarSarlaft = computed(
    () => esFechaExpedicionValida(this.fechaExpedicion()) && !this.consultandoSarlaft(),
  );

  // --- Documentos ---
  protected readonly errorDocumento = signal('');
  protected readonly mensajeDocumento = signal('');
  /** Reglas del uploader de los documentos editables (sin el de identidad). */
  protected readonly reglasEditables: readonly ReglaDocumentoUploader[] = DOCUMENTOS_REGISTRO_BROKER.filter(
    (r) => r.tipo !== 'documentoIdentidad',
  ).map((r) => ({ id: r.tipo, etiqueta: r.etiqueta, descripcion: r.descripcion, icono: 'upload_file', obligatorio: true }));
  protected readonly cargados = computed<Readonly<Record<string, string>>>(() =>
    Object.fromEntries(this.perfil().documentos.filter((d) => d.archivo).map((d) => [d.tipo, d.archivo])),
  );
  protected readonly documentoIdentidad = computed(() =>
    this.perfil().documentos.find((d) => d.tipo === 'documentoIdentidad'),
  );
  protected readonly documentosEditables = computed(() =>
    this.perfil().documentos.filter((d) => d.tipo !== 'documentoIdentidad'),
  );

  // --- Transición de registro ---
  protected readonly confirmarRegistro = signal(false);
  protected readonly registrando = signal(false);
  protected readonly registroCompletado = signal(false);

  protected readonly opcionesSimulacion: readonly OpcionSegmentada[] = [
    { valor: 'PROSPECTO', etiqueta: 'Prospecto' },
    { valor: 'REGISTRADO', etiqueta: 'Registrado' },
  ];

  protected etiquetaDocumento(tipo: TipoDocumentoRegistro): string {
    return DOCUMENTOS_REGISTRO_BROKER.find((r) => r.tipo === tipo)?.etiqueta ?? tipo;
  }

  protected fecha(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
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
        ciudad: this.ciudad(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.guardandoDatos.set(false);
        this.mensajeDatos.set('Tus datos personales se actualizaron.');
      });
  }

  protected descartarDatos(): void {
    const p = this.perfil();
    this.nombre.set(p.nombreCompleto);
    this.correo.set(p.correo);
    this.telefono.set(p.telefono);
    this.ciudad.set(p.ciudad);
    this.mensajeDatos.set('');
  }

  protected actualizarSarlaft(): void {
    if (!this.puedeActualizarSarlaft()) {
      return;
    }
    this.consultandoSarlaft.set(true);
    this.mensajeSarlaft.set('');
    this.servicio
      .actualizarSarlaft(this.fechaExpedicion())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        this.consultandoSarlaft.set(false);
        this.mensajeSarlaft.set(
          p.sarlaft.estado === 'vigente'
            ? 'SARLAFT actualizado: tu conocimiento de cliente está vigente.'
            : 'La fecha de expedición indica que tu SARLAFT no está vigente. Actualízalo con un documento reciente.',
        );
      });
  }

  /** Valida el archivo con la lógica compartida; el backend revalida siempre. */
  protected onDocumento(evento: ArchivoSeleccionado): void {
    const tipo = evento.id as TipoDocumentoRegistro;
    const regla = DOCUMENTOS_REGISTRO_BROKER.find((r) => r.tipo === tipo);
    if (!regla || tipo === 'documentoIdentidad') {
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
      .reemplazarDocumento(tipo, evento.archivo.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.mensajeDocumento.set(`${regla.etiqueta} cargado. Queda en revisión.`));
  }

  protected completarRegistro(): void {
    if (!this.puedeCompletarRegistro() || this.registrando()) {
      return;
    }
    this.registrando.set(true);
    this.servicio
      .completarRegistro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.registrando.set(false);
        this.confirmarRegistro.set(false);
        this.registroCompletado.set(true);
      });
  }

  protected irA(seccion: string): void {
    document.getElementById(seccion)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected simularEstado(valor: string): void {
    this.servicio.simularEstado(valor as EstadoCuenta);
    this.registroCompletado.set(false);
    this.fechaExpedicion.set(this.perfil().sarlaft.fechaExpedicion ?? '');
  }
}
