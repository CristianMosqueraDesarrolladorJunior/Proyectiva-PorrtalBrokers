import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, map, of, tap } from 'rxjs';

import {
  type DatosPersonalesEditables,
  type DocumentoPerfil,
  type EstadoCuenta,
  type EstadoSarlaftPerfil,
  type PerfilCuenta,
} from '../models/cuenta.model';
import type { TipoDocumentoRegistro } from '../models/registro-broker.model';
import { clasificarSarlaft } from '../../features/auth/pages/registro-broker/sarlaft-clasificacion';

/** Latencia simulada de las operaciones mock. */
const LATENCIA_MS = 600;

/** Documentos que exigen la Transicion_Registro (Req 3.16 del portal). */
export const TIPOS_DOCUMENTO_PERFIL: readonly TipoDocumentoRegistro[] = [
  'documentoIdentidad',
  'certificacionBancaria',
  'autorizacionPago',
  'rut',
];

function haceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

function haceAnios(anios: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.round(anios * 365.25));
  return d.toISOString().slice(0, 10);
}

/** Estado SARLAFT derivado de la antigüedad de la fecha de expedición. */
export function estadoSarlaftDesdeFecha(fechaExpedicion: string | null): EstadoSarlaftPerfil {
  if (!fechaExpedicion) {
    return 'sin_consultar';
  }
  const c = clasificarSarlaft(fechaExpedicion, new Date().toISOString());
  if (c === null) {
    return 'sin_consultar';
  }
  return c.nivel === 'exito' ? 'vigente' : c.nivel === 'advertencia' ? 'por_vencer' : 'vencido';
}

/**
 * Perfil de demostración: Juan Pablo envió su solicitud y sigue como
 * PROSPECTO (documentación pendiente y SARLAFT por vencer). Puede radicar y
 * cotizar; sus comisiones se acreditan al completar el registro.
 */
function perfilDemo(): PerfilCuenta {
  const fechaExpedicion = haceAnios(2.7);
  return {
    id: 'CTA-000184',
    estadoCuenta: 'PROSPECTO',
    tipoDocumento: 'CC',
    numeroDocumento: '1095836254',
    nombreCompleto: 'Juan Pablo Restrepo',
    correo: 'juanpablo.restrepo@correo.com',
    telefono: '3001234567',
    ciudad: 'Bogotá',
    comercialAsignado: 'Daniel Ospina',
    fechaIngreso: haceDias(46),
    fechaRegistro: null,
    sarlaft: {
      estado: estadoSarlaftDesdeFecha(fechaExpedicion),
      fechaExpedicion,
      ultimaConsulta: haceDias(46),
    },
    documentos: [
      { tipo: 'documentoIdentidad', estado: 'aprobado', archivo: 'cedula-juan-pablo.pdf', fechaCarga: haceDias(46) },
      { tipo: 'certificacionBancaria', estado: 'pendiente', archivo: '', fechaCarga: null },
      { tipo: 'autorizacionPago', estado: 'en_revision', archivo: 'autorizacion-pago.pdf', fechaCarga: haceDias(3) },
      { tipo: 'rut', estado: 'pendiente', archivo: '', fechaCarga: null },
    ],
    comisiones: { solicitudes: 4, monto: 812000, acreditadas: false },
  };
}

/**
 * Servicio del perfil de la Cuenta (MOCK en memoria, solo UI).
 *
 * TODO backend: `GET /api/v1/auth/session` (estado_cuenta y módulos),
 * `PATCH /api/v1/brokers/perfil`, `POST /api/v1/brokers/documentos` y
 * `POST /api/v1/brokers/solicitudesRegistro` (Transicion_Registro, Req 3).
 * El servidor revalida todo y decide el estado; nada aquí es autoritativo.
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly _perfil = signal<PerfilCuenta>(perfilDemo());

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
      p.sarlaft.estado === 'vigente'
    );
  });

  actualizarDatos(datos: DatosPersonalesEditables): Observable<PerfilCuenta> {
    return this.simular(() => this._perfil.update((p) => ({ ...p, ...datos })));
  }

  /**
   * Reemplaza un documento: queda "en revisión". El documento de identidad NO
   * se puede modificar desde el perfil.
   */
  reemplazarDocumento(tipo: TipoDocumentoRegistro, archivo: string): Observable<PerfilCuenta> {
    if (tipo === 'documentoIdentidad') {
      throw new Error('El documento de identidad no se puede modificar desde el perfil.');
    }
    return this.simular(() =>
      this._perfil.update((p) => ({
        ...p,
        documentos: p.documentos.map(
          (d): DocumentoPerfil =>
            d.tipo === tipo ? { ...d, estado: 'en_revision', archivo, fechaCarga: new Date().toISOString() } : d,
        ),
      })),
    );
  }

  /** Actualiza SARLAFT con una nueva fecha de expedición (consulta simulada). */
  actualizarSarlaft(fechaExpedicion: string): Observable<PerfilCuenta> {
    return this.simular(() =>
      this._perfil.update((p) => ({
        ...p,
        sarlaft: {
          estado: estadoSarlaftDesdeFecha(fechaExpedicion),
          fechaExpedicion,
          ultimaConsulta: new Date().toISOString(),
        },
      })),
    );
  }

  /**
   * Transicion_Registro (Req 3.4–3.6): misma Cuenta pasa a REGISTRADO,
   * conserva su historial y acredita las comisiones retroactivas.
   */
  completarRegistro(): Observable<PerfilCuenta> {
    return this.simular(() =>
      this._perfil.update((p) => ({
        ...p,
        estadoCuenta: 'REGISTRADO',
        fechaRegistro: new Date().toISOString(),
        comisiones: { ...p.comisiones, acreditadas: true },
      })),
    );
  }

  /** Solo demo: alterna el estado para revisar ambas experiencias. */
  simularEstado(estado: EstadoCuenta): void {
    if (estado === 'PROSPECTO') {
      this._perfil.set(perfilDemo());
      return;
    }
    const fechaExpedicion = haceAnios(1.2);
    this._perfil.update((p) => ({
      ...p,
      estadoCuenta: 'REGISTRADO',
      fechaRegistro: haceDias(12),
      sarlaft: { estado: 'vigente', fechaExpedicion, ultimaConsulta: haceDias(12) },
      documentos: TIPOS_DOCUMENTO_PERFIL.map((tipo): DocumentoPerfil => ({
        tipo,
        estado: 'aprobado',
        archivo: `${tipo}.pdf`,
        fechaCarga: haceDias(14),
      })),
      comisiones: { ...p.comisiones, acreditadas: true },
    }));
  }

  /** Aplica el cambio tras una latencia simulada y devuelve el perfil actualizado. */
  private simular(cambio: () => void): Observable<PerfilCuenta> {
    return of(null).pipe(
      delay(LATENCIA_MS),
      tap(cambio),
      map(() => this._perfil()),
    );
  }
}
