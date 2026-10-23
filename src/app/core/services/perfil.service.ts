import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';

import {
  type DatosPersonalesEditables,
  type DocumentoPerfil,
  type EstadoCuenta,
  type EstadoSarlaftPerfil,
  type PerfilCuenta,
} from '../models/cuenta.model';
import type { TipoDocumentoRegistro } from '../models/registro-broker.model';
import type { EstadoSarlaftRadicacion, ResultadoSarlaftRadicacion } from '../models/radicacion.model';
import { abrirFormularioSarlaft } from '../util/sarlaft-enlace';
import { SessionService } from './session.service';
import { CatalogoService } from './catalogo.service';


/**
 * Forma exacta de la respuesta del backend `GET/PUT /api/v1/brokers/perfil`
 * (`PerfilCuentaResponse`).
 */
interface PerfilCuentaBackend {
  readonly id: string;
  readonly estadoCuenta: EstadoCuenta;
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly nombreCompleto: string;
  readonly correo: string | null;
  readonly telefono: string | null;
  readonly fechaRegistro: string | null;
  readonly fechaIngreso?: string | null;
  readonly comercial?: string | null;
  /** Ciudad guardada en el portal; si no hay, se usa la del perfil compartido de Cien Cuadras. */
  readonly ciudad?: string | null;
}

/**
 * Propiedad parcial del perfil compartido de Cien Cuadras (Firestore) expuesto por
 * GET /auth/perfil-compartido. Sólo interesa la `ciudad` para el perfil del broker,
 * ya que este dato no se persiste en `portal.radicador`.
 */
interface PerfilCompartido {
  readonly ciudad: string;
}

/** Estado SARLAFT que decide el backend → estado mostrado en el perfil (sin reglas en el cliente). */
export function estadoSarlaftPerfil(estado: EstadoSarlaftRadicacion | string | null): EstadoSarlaftPerfil {
  switch (estado) {
    case 'ACTUALIZADO':
    case 'puede_continuar':
    case 'exceptuado':
      return 'vigente';
    case 'CONSULTABLE':
      return 'en_cumplimiento';
    case 'formulario_fisico':
      return 'fisico';
    case 'DESACTUALIZADO':
    case 'requiere_actualizacion':
      return 'vencido';
    default:
      return 'sin_consultar';
  }
}

/** Documentos en estado neutro (pendientes) mientras no exista persistencia por cuenta. */
function documentosIniciales(tipos: readonly TipoDocumentoRegistro[] = []): DocumentoPerfil[] {
  return tipos.map((tipo) => ({
    tipo,
    estado: 'pendiente',
    archivo: '',
    fechaCarga: null,
  }));
}

/** Documento del expediente de legalización (`/brokers/legalizacion`). */
interface DocumentoLegalizacion {
  readonly tipo: TipoDocumentoRegistro;
  readonly nombre: string;
  readonly estado: string;
  readonly fechaCarga: string;
  readonly archivoId?: string;
}

/** Expediente de legalización del prospecto guardado en el servidor. */
interface ExpedienteLegalizacion {
  readonly estado: string;
  readonly sarlaftEstado: string | null;
  readonly sarlaftFecha: string | null;
  readonly documentos: readonly DocumentoLegalizacion[];
}

/** Perfil base construido con los datos reales de la sesión del backend. */
function perfilBase(parcial: Partial<PerfilCuenta>): PerfilCuenta {
  return {
    id: '',
    estadoCuenta: 'PROSPECTO',
    tipoDocumento: 'CC',
    numeroDocumento: '',
    nombreCompleto: '',
    correo: '',
    telefono: '',
    ciudad: '',
    comercialAsignado: '',
    fechaIngreso: '',
    fechaRegistro: null,
    sarlaft: { estado: 'sin_consultar', fechaExpedicion: null, ultimaConsulta: null },
    documentos: documentosIniciales(),
    comisiones: { solicitudes: 0, monto: 0, acreditadas: false },
    ...parcial,
  };
}

/**
 * Servicio del perfil de la Cuenta.
 *
 * Los datos personales (nombre, correo, teléfono, documento) y el estado de la
 * Cuenta provienen del backend real (`GET/PUT /api/v1/brokers/perfil`). La UI de
 * etapas de vinculación usa el expediente de legalización (`/brokers/legalizacion`)
 * y la consulta SARLAFT del backend (`/sarlaft/consultas`): el estado lo decide
 * siempre el servidor.
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly catalogo = inject(CatalogoService);
  private readonly baseUrl = '/api/v1';

  /** Perfil inicializado con los datos reales de la sesión; se refresca con `cargar()`. */
  private readonly _perfil = signal<PerfilCuenta>(
    perfilBase({
      estadoCuenta: this.session.perfil()?.estadoCuenta ?? 'PROSPECTO',
      nombreCompleto: this.session.perfil()?.nombre ?? '',
      documentos: documentosIniciales(this.catalogo.codigos<TipoDocumentoRegistro>('documento_legalizacion')),
    }),
  );

  readonly perfil = this._perfil.asReadonly();
  readonly estadoCuenta = computed<EstadoCuenta>(() => this._perfil().estadoCuenta);

  /** Documentos aportados (en revisión o aprobados). */
  readonly documentosAportados = computed(
    () => this._perfil().documentos.filter((d) => d.estado !== 'pendiente').length,
  );

  /** Requisitos para la Transicion_Registro: 4 documentos aportados y SARLAFT vigente. */
  readonly puedeCompletarRegistro = computed(() => {
    const p = this._perfil();
    return (
      p.estadoCuenta === 'PROSPECTO' &&
      p.documentos.every((d) => d.estado !== 'pendiente') &&
      p.legalizacion !== 'EN_REVISION'
    );
  });

  /** Carga el perfil de la cuenta autenticada desde el backend y lo publica. */
  cargar(): Observable<PerfilCuenta> {
    const perfilCuenta$ = this.http.get<PerfilCuentaBackend>(
      `${this.baseUrl}/brokers/perfil`,
      { withCredentials: true },
    );
    const ciudad$ = this.http
      .get<PerfilCompartido>(`${this.baseUrl}/auth/perfil-compartido`, { withCredentials: true })
      .pipe(
        map((r) => (r?.ciudad ?? '').trim()),
        catchError(() => of('')),
      );
    // Expediente real de legalización (documentos y SARLAFT guardados en el servidor).
    const expediente$ = this.http
      .get<ExpedienteLegalizacion>(`${this.baseUrl}/brokers/legalizacion`, { withCredentials: true })
      .pipe(catchError(() => of(null)));
    return forkJoin([perfilCuenta$, ciudad$, expediente$]).pipe(
      map(([dto, ciudad, expediente]) =>
        this.combinar(dto, { ciudad: dto.ciudad?.trim() || ciudad, ...this.desdeExpediente(expediente) })),
      tap((perfil) => this._perfil.set(perfil)),
    );
  }

  /** Actualiza los datos personales y la ciudad en el backend (`PUT /brokers/perfil`). */
  actualizarDatos(datos: DatosPersonalesEditables): Observable<PerfilCuenta> {
    const body = {
      nombreCompleto: datos.nombreCompleto,
      correo: datos.correo,
      telefono: datos.telefono,
      ...(datos.ciudad ? { ciudad: datos.ciudad } : {}),
    };
    return this.http
      .put<PerfilCuentaBackend>(`${this.baseUrl}/brokers/perfil`, body, { withCredentials: true })
      .pipe(
        map((dto) => this.combinar(dto, dto.ciudad ? { ciudad: dto.ciudad } : {})),
        tap((perfil) => this._perfil.set(perfil)),
      );
  }

  /**
   * Reemplaza un documento: queda "en revisión". El documento de identidad NO
   * se puede modificar desde el perfil. (Estado local hasta que exista endpoint
   * de documentos por cuenta; el backend revalidará al enviar el registro.)
   */
  reemplazarDocumento(tipo: TipoDocumentoRegistro, archivo: File): Observable<PerfilCuenta> {
    // El documento de identidad solo es inmodificable cuando YA tiene archivo cargado;
    // si nunca se cargó, se permite el primer alta desde el perfil.
    if (tipo === 'documentoIdentidad') {
      const identidad = this._perfil().documentos.find((d) => d.tipo === 'documentoIdentidad');
      if (identidad?.archivo) {
        throw new Error('El documento de identidad ya está cargado y no se puede modificar.');
      }
    }
    const cuerpo = new FormData();
    cuerpo.append('tipo', tipo);
    cuerpo.append('archivo', archivo);
    return this.http
      .post<DocumentoLegalizacion>(`${this.baseUrl}/brokers/legalizacion/documentos`, cuerpo, { withCredentials: true })
      .pipe(
        map((doc) => {
          this._perfil.update((p) => ({
            ...p,
            documentos: p.documentos.map(
              (d): DocumentoPerfil =>
                d.tipo === tipo ? { ...d, estado: 'en_revision', archivo: doc.nombre, fechaCarga: doc.fechaCarga } : d,
            ),
          }));
          return this._perfil();
        }),
      );
  }

  /** Imagen de la firma (PNG o JPG) que se estampa en cada cuenta de cobro; reemplaza la anterior. */
  cargarFirma(archivo: File): Observable<PerfilCuenta> {
    const cuerpo = new FormData();
    cuerpo.append('tipo', 'firma');
    cuerpo.append('archivo', archivo);
    return this.http
      .post<DocumentoLegalizacion>(`${this.baseUrl}/brokers/legalizacion/documentos`, cuerpo, { withCredentials: true })
      .pipe(
        map((doc) => {
          this._perfil.update((p) => ({
            ...p,
            firma: doc.archivoId ? { archivoId: doc.archivoId, nombre: doc.nombre, fechaCarga: doc.fechaCarga } : p.firma,
          }));
          return this._perfil();
        }),
      );
  }

  /** Dirección de la imagen de la firma para la vista previa (la sirve el backend solo a su dueño). */
  urlFirma(archivoId: string): string {
    return `${this.baseUrl}/brokers/legalizacion/documentos/${encodeURIComponent(archivoId)}`;
  }

  /**
   * Consulta el Conocimiento de Cliente del broker con su documento (`POST /sarlaft/consultas`); el backend decide.
   * Sin fecha de expedición. Si está desactualizado, SARLAFT envía el enlace por SMS al celular registrado.
   */
  actualizarSarlaft(): Observable<PerfilCuenta> {
    const p = this._perfil();
    return this.http
      .post<ResultadoSarlaftRadicacion>(
        `${this.baseUrl}/sarlaft/consultas`,
        {
          documento: p.numeroDocumento,
          tipoDocumento: p.tipoDocumento,
          // Con el celular SARLAFT genera la URL de actualización y la envía por SMS (igual que el cotizador).
          ...(/^3\d{9}$/.test((p.telefono ?? '').replace(/\D/g, '')) ? { celular: p.telefono.replace(/\D/g, '') } : {}),
        },
        { withCredentials: true },
      )
      .pipe(
        map((r) => {
          this._perfil.update((actual) => ({
            ...actual,
            sarlaft: {
              ...actual.sarlaft,
              // Con el físico cargado, una consulta que no queda vigente sigue en revisión con el físico.
              estado: actual.sarlaft.fisico && estadoSarlaftPerfil(r.estado) !== 'vigente' ? 'fisico' : estadoSarlaftPerfil(r.estado),
              ultimaConsulta: r.fechaConsulta,
              radicadoCumplimiento: r.radicadoCumplimiento,
              enlaceActualizacion: r.enlaceActualizacion,
            },
          }));
          if (r.estado === 'DESACTUALIZADO') {
            abrirFormularioSarlaft(r.enlaceActualizacion);
          }
          return this._perfil();
        }),
      );
  }

  /**
   * Transicion_Registro (Req 3.4–3.6): la misma Cuenta pasa a REGISTRADO. El
   * backend es la fuente autoritativa del estado; aquí se refleja localmente para
   * la navegación de la UI de vinculación.
   */
  /** Carga el SARLAFT físico (formulario diligenciado y firmado) al expediente: queda en revisión del área. */
  cargarSarlaftFisico(archivo: File): Observable<PerfilCuenta> {
    const cuerpo = new FormData();
    cuerpo.append('tipo', 'formularioSarlaft');
    cuerpo.append('archivo', archivo);
    return this.http
      .post<DocumentoLegalizacion>(`${this.baseUrl}/brokers/legalizacion/documentos`, cuerpo, { withCredentials: true })
      .pipe(
        map((doc) => {
          this._perfil.update((p) => ({
            ...p,
            sarlaft: { ...p.sarlaft, fisico: doc.nombre, estado: p.sarlaft.estado === 'vigente' ? 'vigente' : 'fisico' },
          }));
          return this._perfil();
        }),
      );
  }

  completarRegistro(): Observable<PerfilCuenta> {
    // El servidor consulta SARLAFT y deja la solicitud EN_REVISION: el área aprueba con sus
    // validadores y solo entonces la cuenta pasa a REGISTRADO.
    return this.http
      .post<{ estado: string }>(`${this.baseUrl}/brokers/legalizacion/solicitud`, {}, { withCredentials: true })
      .pipe(
        map((solicitud) => {
          this._perfil.update((p) => ({ ...p, legalizacion: solicitud.estado }));
          return this._perfil();
        }),
      );
  }

  /** Documentos y SARLAFT del expediente del servidor sobre el perfil local. */
  private desdeExpediente(e: ExpedienteLegalizacion | null): Partial<PerfilCuenta> {
    if (!e) return {};
    const previo = this._perfil();
    const firma = e.documentos.find((x) => (x.tipo as string) === 'firma');
    return {
      legalizacion: e.estado,
      firma: firma?.archivoId ? { archivoId: firma.archivoId, nombre: firma.nombre, fechaCarga: firma.fechaCarga } : null,
      documentos: previo.documentos.map((d): DocumentoPerfil => {
        const servidor = e.documentos.find((x) => x.tipo === d.tipo);
        return servidor
          ? { ...d, estado: servidor.estado === 'APROBADO' ? 'aprobado' : 'en_revision', archivo: servidor.nombre, fechaCarga: servidor.fechaCarga }
          : d;
      }),
      ...(() => {
        const fisico = e.documentos.find((x) => (x.tipo as string) === 'formularioSarlaft')?.nombre ?? null;
        const estado = e.sarlaftEstado ? estadoSarlaftPerfil(e.sarlaftEstado) : previo.sarlaft.estado;
        return e.sarlaftEstado || fisico
          ? { sarlaft: { ...previo.sarlaft, fisico, estado: fisico && estado !== 'vigente' ? 'fisico' : estado,
              ultimaConsulta: e.sarlaftFecha ?? previo.sarlaft.ultimaConsulta } }
          : {};
      })(),
    };
  }

  /** Combina la respuesta del backend con el estado local (SARLAFT/documentos/ciudad). */
  private combinar(dto: PerfilCuentaBackend, extra: Partial<PerfilCuenta> = {}): PerfilCuenta {
    const previo = this._perfil();
    return {
      ...previo,
      id: dto.id,
      estadoCuenta: dto.estadoCuenta,
      tipoDocumento: (dto.tipoDocumento as PerfilCuenta['tipoDocumento']) ?? 'CC',
      numeroDocumento: dto.numeroDocumento,
      nombreCompleto: dto.nombreCompleto,
      correo: dto.correo ?? '',
      telefono: dto.telefono ?? '',
      fechaRegistro: dto.fechaRegistro,
      fechaIngreso: dto.fechaIngreso ?? previo.fechaIngreso,
      comercialAsignado: dto.comercial ?? previo.comercialAsignado,
      ...extra,
    };
  }
}
