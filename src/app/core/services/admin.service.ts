import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

import {
  BrokerAdmin,
  BrokerResumen,
  CarteraMock,
  Comercial,
  ComercialResumen,
  DatosAccesoComercial,
  FiltrosBrokers,
  FiltrosNegocios,
  Indicadores,
  Negocio,
  Pagina,
} from '../models/admin.model';
import { PerfilBroker } from '../models/broker.model';
import {
  INDICADORES_VACIOS,
  agruparPorMes,
  calcularIndicadores,
  combinar,
  generarClaveTemporal,
  normalizarBusqueda,
  paginar,
  pendientes,
  validarDatosComercial,
  cuentaMock,
} from './admin.helpers';
import { SessionService } from './session.service';

/**
 * BYPASS TEMPORAL DE DESARROLLO — Consola de administración con datos mock.
 *
 * Los datos salen de `mock/admin-cartera.json` (generado desde el CSV del
 * Warehouse con `scripts/generar-mock-admin.mjs`, servido solo en desarrollo).
 * Lo que cambia la consola (comerciales creados, accesos, reasignaciones) se
 * guarda en `localStorage` de este navegador.
 *
 * Seguridad: el filtro por cartera y la regla "solo el Administrador escribe"
 * se aplican aquí para que la demo se comporte como el backend real, pero en
 * producción los debe aplicar el API (`/api/v1/admin/*`) usando el
 * `comercialId` de la sesión, nunca uno enviado por el cliente. Las claves mock
 * quedan en texto plano en el navegador: NO usar con credenciales reales.
 *
 * TODO: reemplazar por llamadas HTTP a `/api/v1/admin/*` cuando exista el backend.
 */

/** Usuario administrador de demostración. */
export const ADMIN_DEMO = {
  cedula: '1000000001',
  clave: 'Admin#2026',
  nombre: 'Administrador Operación',
} as const;

const CLAVE_STORAGE = 'proyectiva-admin-mock:v1';

/** Acceso de un comercial a la consola (mock). */
interface AccesoMock {
  readonly nombre: string;
  readonly cedula: string;
  readonly correo: string;
  readonly clave: string;
}

/** Cambios hechos desde la consola, persistidos en localStorage. */
interface EstadoPersistido {
  readonly creados: readonly { readonly id: string; readonly nombre: string }[];
  readonly accesos: Readonly<Record<string, AccesoMock>>;
  readonly inactivos: readonly string[];
  readonly reasignaciones: Readonly<Record<string, string>>;
}

const ESTADO_VACIO: EstadoPersistido = { creados: [], accesos: {}, inactivos: [], reasignaciones: {} };

function leerEstado(): EstadoPersistido {
  try {
    const bruto = localStorage.getItem(CLAVE_STORAGE);
    if (!bruto) return ESTADO_VACIO;
    const e = JSON.parse(bruto) as Partial<EstadoPersistido>;
    return {
      creados: Array.isArray(e.creados) ? e.creados : [],
      accesos: e.accesos && typeof e.accesos === 'object' ? e.accesos : {},
      inactivos: Array.isArray(e.inactivos) ? e.inactivos : [],
      reasignaciones: e.reasignaciones && typeof e.reasignaciones === 'object' ? e.reasignaciones : {},
    };
  } catch {
    return ESTADO_VACIO;
  }
}

function guardarEstado(e: EstadoPersistido): void {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(e));
  } catch {
    // Sin storage (modo privado): los cambios viven solo en memoria.
  }
}

/**
 * Autentica contra los usuarios mock de la consola.
 *
 * @returns el perfil si las credenciales son de un usuario interno válido;
 *   `'invalida'` si la cédula es de un usuario interno pero la clave no
 *   coincide (o el comercial está inactivo); `null` si la cédula no es de un
 *   usuario interno (sigue el login de broker).
 */
export function autenticarUsuarioInterno(cedula: string, clave: string): PerfilBroker | 'invalida' | null {
  if (cedula === ADMIN_DEMO.cedula) {
    return clave === ADMIN_DEMO.clave ? { nombre: ADMIN_DEMO.nombre, rol: 'Administrador' } : 'invalida';
  }
  const estado = leerEstado();
  const entrada = Object.entries(estado.accesos).find(([, a]) => a.cedula === cedula);
  if (!entrada) return null;
  const [comercialId, acceso] = entrada;
  if (acceso.clave !== clave || estado.inactivos.includes(comercialId)) return 'invalida';
  return { nombre: acceso.nombre, rol: 'Comercial', comercialId };
}

/** Resumen global o de una cartera. */
export interface ResumenCartera {
  readonly indicadores: Indicadores;
  readonly brokers: number;
  readonly brokersConPendientes: number;
  readonly porMes: ReturnType<typeof agruparPorMes>;
  readonly ultimoMes: { readonly clave: string; readonly negocios: number; readonly expedidos: number; readonly prima: number };
  readonly alertas: readonly (Negocio & { readonly brokerNombre: string; readonly comercialNombre: string })[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  private readonly datos = signal<CarteraMock | null>(null);
  private readonly estado = signal<EstadoPersistido>(leerEstado());
  private carga$?: Observable<boolean>;

  readonly cargado = computed(() => this.datos() !== null);
  readonly errorCarga = signal(false);

  /** Rol actual y cartera a la que está limitado (null = todas). */
  readonly esAdmin = computed(() => this.session.perfil()?.rol === 'Administrador');
  readonly alcance = computed<string | null>(() => {
    const p = this.session.perfil();
    return p?.rol === 'Comercial' ? p.comercialId ?? '__sin_cartera__' : null;
  });

  /** Comerciales (CSV + creados en la consola) con sus accesos. */
  readonly comerciales = computed<readonly Comercial[]>(() => {
    const d = this.datos();
    const e = this.estado();
    const base = [
      ...(d?.comerciales ?? []).map((c) => ({ ...c, origen: 'csv' as const })),
      ...e.creados.map((c) => ({ ...c, origen: 'consola' as const })),
    ];
    return base.map((c) => {
      const acceso = e.accesos[c.id];
      return {
        id: c.id,
        nombre: c.nombre,
        origen: c.origen,
        activo: !e.inactivos.includes(c.id),
        conAcceso: !!acceso,
        cedula: acceso?.cedula,
        correo: acceso?.correo,
      };
    });
  });

  private readonly nombreComercial = computed(() => new Map(this.comerciales().map((c) => [c.id, c.nombre])));

  /** Brokers con el comercial vigente (aplicando reasignaciones). */
  private readonly brokers = computed<readonly BrokerAdmin[]>(() => {
    const reasig = this.estado().reasignaciones;
    return (this.datos()?.brokers ?? []).map((b) =>
      reasig[b.id] ? { ...b, comercialId: reasig[b.id] } : b,
    );
  });

  private readonly brokerPorId = computed(() => new Map(this.brokers().map((b) => [b.id, b])));

  /** Negocios agrupados por broker (los negocios no cambian). */
  private readonly negociosPorBroker = computed(() => {
    const m = new Map<string, Negocio[]>();
    for (const n of this.datos()?.negocios ?? []) {
      const lista = m.get(n.brokerId);
      if (lista) lista.push(n);
      else m.set(n.brokerId, [n]);
    }
    return m;
  });

  /** Brokers visibles para el usuario actual, con indicadores. */
  readonly brokersVisibles = computed<readonly BrokerResumen[]>(() => {
    const alcance = this.alcance();
    const nombres = this.nombreComercial();
    const porBroker = this.negociosPorBroker();
    return this.brokers()
      .filter((b) => alcance === null || b.comercialId === alcance)
      .map((b) => {
        const negocios = porBroker.get(b.id) ?? [];
        const ultima = negocios.reduce((max, n) => (n.fecha > max ? n.fecha : max), '');
        return {
          ...b,
          ...calcularIndicadores(negocios),
          ...cuentaMock(b.id),
          comercialNombre: nombres.get(b.comercialId) ?? b.comercialId,
          ultimaRadicacion: ultima,
        };
      });
  });

  /** Negocios visibles para el usuario actual. */
  readonly negociosVisibles = computed<readonly Negocio[]>(() => {
    const alcance = this.alcance();
    const brokers = this.brokerPorId();
    const todos = this.datos()?.negocios ?? [];
    return alcance === null ? todos : todos.filter((n) => brokers.get(n.brokerId)?.comercialId === alcance);
  });

  /** Carga el JSON mock una sola vez. */
  cargar(): Observable<boolean> {
    if (this.datos()) return of(true);
    this.carga$ ??= this.http.get<CarteraMock>('/mock/admin-cartera.json').pipe(
      tap((d) => {
        this.datos.set(d);
        this.errorCarga.set(false);
      }),
      map(() => true),
      catchError(() => {
        this.errorCarga.set(true);
        this.carga$ = undefined;
        return of(false);
      }),
      shareReplay(1),
    );
    return this.carga$;
  }

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  resumen(comercialId?: string): ResumenCartera {
    const brokers = this.brokersVisibles().filter((b) => !comercialId || b.comercialId === comercialId);
    const ids = new Set(brokers.map((b) => b.id));
    const negocios = this.negociosVisibles().filter((n) => ids.has(n.brokerId));
    const indicadores = brokers.reduce<Indicadores>((acc, b) => combinar(acc, b), INDICADORES_VACIOS);
    const porMes = agruparPorMes(negocios, 12);
    const ultimaClave = porMes.at(-1)?.clave ?? '';
    const delMes = negocios.filter((n) => n.fecha.startsWith(ultimaClave));
    const indMes = calcularIndicadores(delMes);
    const porId = this.brokerPorId();
    const nombres = this.nombreComercial();
    const alertas = negocios
      .filter((n) => n.estado.startsWith('Pendiente'))
      .sort((a, b) => b.horasGestion - a.horasGestion)
      .slice(0, 8)
      .map((n) => {
        const b = porId.get(n.brokerId);
        return { ...n, brokerNombre: b?.nombre ?? n.brokerId, comercialNombre: nombres.get(b?.comercialId ?? '') ?? '—' };
      });
    return {
      indicadores,
      brokers: brokers.length,
      brokersConPendientes: brokers.filter((b) => pendientes(b) > 0).length,
      porMes,
      ultimoMes: { clave: ultimaClave, negocios: indMes.negocios, expedidos: indMes.expedidos, prima: indMes.primaExpedida },
      alertas,
    };
  }

  listarBrokers(filtros: FiltrosBrokers, pagina: number, tamano: number): Pagina<BrokerResumen> {
    const q = normalizarBusqueda(filtros.busqueda ?? '');
    const lista = this.brokersVisibles()
      .filter((b) => !filtros.comercialId || b.comercialId === filtros.comercialId)
      .filter((b) => !filtros.tipo || b.tipo === filtros.tipo)
      .filter((b) => !filtros.estadoCuenta || b.estadoCuenta === filtros.estadoCuenta)
      .filter((b) => !filtros.soloConPendientes || pendientes(b) > 0)
      .filter((b) => !q || normalizarBusqueda(`${b.nombre} ${b.id} ${b.correo}`).includes(q))
      .slice()
      .sort((a, b) => pendientes(b) - pendientes(a) || b.negocios - a.negocios);
    return paginar(lista, pagina, tamano);
  }

  listarNegocios(filtros: FiltrosNegocios, pagina: number, tamano: number): Pagina<Negocio & { brokerNombre: string; comercialNombre: string }> {
    const q = normalizarBusqueda(filtros.busqueda ?? '');
    const porId = this.brokerPorId();
    const nombres = this.nombreComercial();
    const lista = this.negociosVisibles()
      .filter((n) => !filtros.brokerId || n.brokerId === filtros.brokerId)
      .filter((n) => !filtros.comercialId || porId.get(n.brokerId)?.comercialId === filtros.comercialId)
      .filter((n) => !filtros.estado || n.estado === filtros.estado)
      .filter((n) => !filtros.desde || n.fecha.slice(0, 10) >= filtros.desde)
      .filter((n) => !filtros.hasta || n.fecha.slice(0, 10) <= filtros.hasta)
      .map((n) => {
        const b = porId.get(n.brokerId);
        return { ...n, brokerNombre: b?.nombre ?? n.brokerId, comercialNombre: nombres.get(b?.comercialId ?? '') ?? '—' };
      })
      .filter((n) => !q || normalizarBusqueda(`${n.codigo} ${n.poliza} ${n.brokerNombre} ${n.ciudad}`).includes(q))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    return paginar(lista, pagina, tamano);
  }

  negociosDeBroker(brokerId: string): readonly Negocio[] {
    const b = this.brokerPorId().get(brokerId);
    const alcance = this.alcance();
    if (!b || (alcance !== null && b.comercialId !== alcance)) return [];
    return [...(this.negociosPorBroker().get(brokerId) ?? [])].sort((x, y) => (x.fecha < y.fecha ? 1 : -1));
  }

  comercialesResumen(): readonly ComercialResumen[] {
    const brokers = this.brokersVisibles();
    const hace90 = this.fechaReferencia(-90);
    return this.comerciales()
      .filter((c) => this.alcance() === null || c.id === this.alcance())
      .map((c) => {
        const propios = brokers.filter((b) => b.comercialId === c.id);
        return {
          ...c,
          ...propios.reduce<Indicadores>((acc, b) => combinar(acc, b), INDICADORES_VACIOS),
          brokers: propios.length,
          brokersActivos90d: propios.filter((b) => b.ultimaRadicacion >= hace90).length,
        };
      })
      .sort((a, b) => b.brokers - a.brokers);
  }

  /** Fecha ISO relativa al último dato disponible (los datos son históricos). */
  private fechaReferencia(dias: number): string {
    const ultima = (this.datos()?.negocios ?? []).reduce((m, n) => (n.fecha > m ? n.fecha : m), '');
    if (!ultima) return '';
    const d = new Date(ultima.slice(0, 10) + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  }

  // ---------------------------------------------------------------------------
  // Escrituras (solo Administrador)
  // ---------------------------------------------------------------------------

  private exigirAdmin(): void {
    if (!this.esAdmin()) {
      throw new Error('Solo un administrador puede hacer este cambio.');
    }
  }

  private cedulasOcupadas(exceptoId?: string): Set<string> {
    const s = new Set<string>([ADMIN_DEMO.cedula]);
    for (const [id, a] of Object.entries(this.estado().accesos)) {
      if (id !== exceptoId) s.add(a.cedula);
    }
    return s;
  }

  private actualizar(fn: (e: EstadoPersistido) => EstadoPersistido): void {
    const nuevo = fn(this.estado());
    this.estado.set(nuevo);
    guardarEstado(nuevo);
  }

  /** Crea un comercial con acceso. Devuelve la clave temporal (se muestra una vez). */
  crearComercial(datos: DatosAccesoComercial): { comercial: Comercial; clave: string } | { error: string } {
    this.exigirAdmin();
    const error = validarDatosComercial(datos, this.cedulasOcupadas());
    if (error) return { error };
    const base = normalizarBusqueda(datos.nombre).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let id = base;
    for (let i = 2; this.comerciales().some((c) => c.id === id); i++) id = `${base}-${i}`;
    const clave = generarClaveTemporal();
    this.actualizar((e) => ({
      ...e,
      creados: [...e.creados, { id, nombre: datos.nombre.trim() }],
      accesos: { ...e.accesos, [id]: { nombre: datos.nombre.trim(), cedula: datos.cedula, correo: datos.correo.trim().toLowerCase(), clave } },
    }));
    const comercial = this.comerciales().find((c) => c.id === id)!;
    return { comercial, clave };
  }

  /** Crea (o recrea) el acceso de un comercial existente. Devuelve la clave temporal. */
  crearAcceso(comercialId: string, datos: DatosAccesoComercial): { clave: string } | { error: string } {
    this.exigirAdmin();
    const error = validarDatosComercial(datos, this.cedulasOcupadas(comercialId));
    if (error) return { error };
    const clave = generarClaveTemporal();
    this.actualizar((e) => ({
      ...e,
      accesos: { ...e.accesos, [comercialId]: { nombre: datos.nombre.trim(), cedula: datos.cedula, correo: datos.correo.trim().toLowerCase(), clave } },
    }));
    return { clave };
  }

  /** Genera una nueva clave temporal para un comercial con acceso. */
  restablecerClave(comercialId: string): string | null {
    this.exigirAdmin();
    const acceso = this.estado().accesos[comercialId];
    if (!acceso) return null;
    const clave = generarClaveTemporal();
    this.actualizar((e) => ({ ...e, accesos: { ...e.accesos, [comercialId]: { ...acceso, clave } } }));
    return clave;
  }

  alternarActivo(comercialId: string): void {
    this.exigirAdmin();
    this.actualizar((e) => ({
      ...e,
      inactivos: e.inactivos.includes(comercialId)
        ? e.inactivos.filter((x) => x !== comercialId)
        : [...e.inactivos, comercialId],
    }));
  }

  /** Reasigna brokers a un comercial. */
  reasignar(brokerIds: readonly string[], comercialId: string): number {
    this.exigirAdmin();
    if (!this.comerciales().some((c) => c.id === comercialId)) return 0;
    const original = new Map((this.datos()?.brokers ?? []).map((b) => [b.id, b.comercialId]));
    this.actualizar((e) => {
      const reasignaciones = { ...e.reasignaciones };
      for (const id of brokerIds) {
        if (!original.has(id)) continue;
        if (original.get(id) === comercialId) delete reasignaciones[id];
        else reasignaciones[id] = comercialId;
      }
      return { ...e, reasignaciones };
    });
    return brokerIds.length;
  }

  /** Borra todos los cambios hechos en la consola (solo demo). */
  restaurarDemo(): void {
    this.exigirAdmin();
    this.actualizar(() => ESTADO_VACIO);
  }
}
