import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

/** Fila de un catálogo: código, descripción y columnas propias de la tabla (p. ej. `departamento`). */
export interface ItemCatalogo {
  readonly codigo: string;
  readonly descripcion: string;
  readonly [columna: string]: unknown;
}

/** Respuesta de `GET /api/v1/catalogos`. */
export interface Catalogos {
  /** Tablas `cat_*` sin el prefijo: `motivo_no_renovacion`, `ciudad`, `tipo_documento`… */
  readonly tablas: Readonly<Record<string, readonly ItemCatalogo[]>>;
  /** Parámetros numéricos del negocio (`parametro_negocio`): `IVA_CANON_COMERCIO`, `VIGENCIA_MAX_MESES`… */
  readonly parametros?: Readonly<Record<string, number>>;
  /** Estados del seguimiento del broker (`radicada`, `observada`…). */
  readonly seguimiento: readonly ItemCatalogo[];
  /** Estados del Consolidado traducidos (`EN_CORRECCION` → "Corrección pendiente"). */
  readonly radicacionWarehouse: readonly ItemCatalogo[];
  /** Grupos de renovación del Warehouse (`POR_RENOVAR`, `EN_EXPEDICION`…). */
  readonly renovacionWarehouse: readonly ItemCatalogo[];
}

const VACIO: Catalogos = { tablas: {}, seguimiento: [], radicacionWarehouse: [], renovacionWarehouse: [] };

/**
 * Catálogos del portal (fuente única: la base de datos vía `GET /api/v1/catalogos`). El front no mantiene listas de
 * negocio propias: opciones de selects, etiquetas de estados y reglas de documentos salen de aquí.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly datos = signal<Catalogos>(VACIO);
  private carga$?: Observable<Catalogos>;

  /** `true` cuando ya llegaron los catálogos. */
  readonly listo = computed(() => this.datos() !== VACIO);

  /** Carga una sola vez (compartida); si falla, los selects quedan vacíos y se reintenta en la siguiente llamada. */
  cargar(): Observable<Catalogos> {
    if (!this.carga$) {
      this.carga$ = this.http.get<Catalogos>('/api/v1/catalogos').pipe(
        tap((c) => this.datos.set(c)),
        catchError(() => {
          this.carga$ = undefined;
          return of(VACIO);
        }),
        shareReplay(1),
      );
    }
    return this.carga$;
  }

  /** Opciones activas de una tabla (señal reactiva). */
  opciones(tabla: string): readonly ItemCatalogo[] {
    return this.datos().tablas[tabla] ?? [];
  }

  /** Códigos activos de una tabla; con `bandera`, solo las filas donde esa columna booleana es `true`. */
  codigos<T extends string = string>(tabla: string, bandera?: string): readonly T[] {
    return this.opciones(tabla)
      .filter((i) => !bandera || i[bandera] === true)
      .map((i) => i.codigo as T);
  }

  /** Mapa código → descripción de una tabla (para etiquetas en plantillas). */
  etiquetas(tabla: string): Readonly<Record<string, string>> {
    return Object.fromEntries(this.opciones(tabla).map((i) => [i.codigo, i.descripcion]));
  }

  /**
   * Insignias de una tabla: `{codigo: {etiqueta, variante}}`. La etiqueta sale del catálogo; el color es solo
   * presentación y lo aporta la pantalla (`info` por defecto).
   */
  insignias<V extends string>(
    tabla: string,
    variantes: Readonly<Partial<Record<string, V>>>,
    defecto: V,
  ): Readonly<Partial<Record<string, { etiqueta: string; variante: V }>>> {
    return Object.fromEntries(
      this.opciones(tabla).map((i) => [i.codigo, { etiqueta: i.descripcion, variante: variantes[i.codigo] ?? defecto }]),
    );
  }

  /** Descripción de un código; si no está en el catálogo devuelve el código tal cual. */
  etiqueta(tabla: string, codigo: string | null | undefined): string {
    if (!codigo) return '';
    return this.opciones(tabla).find((i) => i.codigo === codigo)?.descripcion ?? codigo;
  }

  /** Parámetro numérico del negocio; `NaN` si no llegó (el backend revalida siempre). */
  parametro(clave: string): number {
    const valor = this.datos().parametros?.[clave];
    return valor === undefined ? Number.NaN : Number(valor);
  }

  /** Texto de negocio del catálogo `texto_portal`. */
  texto(codigo: string): string {
    return this.opciones('texto_portal').find((i) => i.codigo === codigo)?.descripcion ?? '';
  }

  /** Fija los catálogos sin HTTP (pruebas). */
  usar(catalogos: Catalogos): void {
    this.datos.set(catalogos);
  }

  /** Módulos que se desbloquean al pasar a REGISTRADO (catálogo `modulo_portal`, `prospecto = false`). */
  modulosRestringidos(): readonly { readonly ruta: string; readonly etiqueta: string; readonly icono: string }[] {
    return this.opciones('modulo_portal')
      .filter((m) => m['prospecto'] !== true)
      .map((m) => ({ ruta: m.codigo, etiqueta: m.descripcion, icono: String(m['icono'] ?? '') }));
  }

  seguimiento(): readonly ItemCatalogo[] {
    return this.datos().seguimiento;
  }

  etiquetaSeguimiento(codigo: string): string {
    return this.datos().seguimiento.find((i) => i.codigo === codigo)?.descripcion ?? codigo;
  }

  renovacionWarehouse(): readonly ItemCatalogo[] {
    return this.datos().renovacionWarehouse;
  }

  /** Para pruebas y componentes que necesitan esperar los catálogos. */
  cargado(): Observable<boolean> {
    return this.cargar().pipe(map((c) => c !== VACIO));
  }
}
