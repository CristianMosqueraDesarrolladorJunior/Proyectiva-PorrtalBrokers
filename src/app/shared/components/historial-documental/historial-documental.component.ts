import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type { Observable } from 'rxjs';

import type {
  ContratoHistorial,
  CotizacionHistorial,
  HistorialDocumental,
} from '../../../core/services/documentos.service';
import { cop, fechaCorta } from '../../../core/services/admin.helpers';
import { DataTableComponent, type AccionFila, type ColumnaTabla, type FilaTabla } from '../data-table/data-table.component';
import { EstadoVistaComponent } from '../estado-vista/estado-vista.component';
import { IconComponent } from '../icon/icon.component';
import { ModalDialogComponent } from '../modal-dialog/modal-dialog.component';
import { VisorArchivoComponent } from '../visor-archivo/visor-archivo.component';

export type TipoDocumentoHistorial = 'contrato' | 'cotizacion';

const VER = { key: 'ver', header: '', tipo: 'accion', textoAccion: 'Ver', alinear: 'derecha' } as const;

const COLUMNAS_CONTRATOS: readonly ColumnaTabla[] = [
  { key: 'referencia', header: 'Contrato', tipo: 'principal', ordenable: true, nowrap: true },
  { key: 'partes', header: 'Propietario / inquilino', tipo: 'principal' },
  { key: 'fecha', header: 'Elaborado', ordenable: true, nowrap: true },
  VER,
];

const COLUMNAS_COTIZACIONES: readonly ColumnaTabla[] = [
  { key: 'referencia', header: 'Cotización', tipo: 'principal', ordenable: true, nowrap: true },
  { key: 'inmueble', header: 'Inmueble', tipo: 'principal' },
  { key: 'total', header: 'Total', alinear: 'derecha', ordenable: true, nowrap: true },
  { key: 'fecha', header: 'Fecha', ordenable: true, nowrap: true },
  VER,
];

/** Documentos de un dueño: el propio broker, o en la consola cada broker o prospecto de la cartera. */
interface Grupo {
  readonly titulo: string;
  readonly contratos: readonly FilaTabla[];
  readonly cotizaciones: readonly FilaTabla[];
}

const filaContrato = (c: ContratoHistorial): FilaTabla => ({
  referencia: c.referencia,
  referenciaSub: c.radicado ? `Solicitud ${c.radicado}` : 'Sin solicitud de póliza',
  partes: c.propietario ?? '—',
  partesSub: [c.inquilino, c.inmueble].filter(Boolean).join(' · '),
  fecha: fechaCorta(c.fecha),
  fechaOrden: c.fecha,
  ver: '',
});

const filaCotizacion = (c: CotizacionHistorial): FilaTabla => ({
  referencia: c.referencia,
  referenciaSub: c.contrato ? `Contrato ${c.contrato}` : '',
  inmueble: c.tipoInmueble ?? '—',
  inmuebleSub: c.ciudad ?? '',
  total: cop(c.total ?? 0),
  totalOrden: c.total ?? 0,
  fecha: fechaCorta(c.fecha),
  fechaOrden: c.fecha,
  ver: '',
});

/**
 * Historial documental en colapsables: contratos y cotizaciones lado a lado (mitad y mitad) con vista
 * previa del PDF. El broker ve un solo grupo con lo suyo; la consola, un grupo por broker o prospecto de la cartera
 * que el servidor ya acotó (Comercial: los suyos; Administrador: todos). Se busca con Ctrl+K (`?q=`).
 */
@Component({
  selector: 'app-historial-documental',
  standalone: true,
  imports: [DataTableComponent, EstadoVistaComponent, IconComponent, ModalDialogComponent, VisorArchivoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-estado-vista [cargando]="cargando()" [error]="error()" entidad="historial de documentos" (reintentar)="cargar()">
      @if (grupos().length === 0) {
        <p class="hd-vacio">Aún no hay contratos ni cotizaciones.</p>
      }

      @for (g of grupos(); track g.titulo) {
        <details class="hd">
          <summary class="hd__cab">
            <span class="hd__icono" aria-hidden="true">
              <app-icon [nombre]="conBroker() ? 'person' : 'folder_open'" [tamano]="18" />
            </span>
            <span class="hd__titulo">{{ g.titulo }}</span>
            <span class="hd__conteo">{{ g.contratos.length }} contratos · {{ g.cotizaciones.length }} cotizaciones</span>
            <span class="hd__chevron" aria-hidden="true"><app-icon nombre="expand_more" [tamano]="20" /></span>
          </summary>
          <div class="hd__tablas">
            <div class="hd__columna">
              <h4 class="hd__subtitulo">Contratos</h4>
              <app-data-table
                [columnas]="columnasContratos"
                [filas]="g.contratos"
                [total]="g.contratos.length"
                [tamanoPagina]="5"
                [ariaLabel]="'Contratos de ' + g.titulo"
                mensajeVacio="Aún no hay contratos elaborados."
                (accion)="ver('contrato', g.contratos, $event)"
              />
            </div>
            <div class="hd__columna">
              <h4 class="hd__subtitulo">Cotizaciones</h4>
              <app-data-table
                [columnas]="columnasCotizaciones"
                [filas]="g.cotizaciones"
                [total]="g.cotizaciones.length"
                [tamanoPagina]="5"
                [ariaLabel]="'Cotizaciones de ' + g.titulo"
                mensajeVacio="Aún no hay cotizaciones."
                (accion)="ver('cotizacion', g.cotizaciones, $event)"
              />
            </div>
          </div>
        </details>
      }
    </app-estado-vista>

    <app-modal-dialog
      [abierto]="seleccion() !== null"
      [titulo]="(seleccion()?.tipo === 'contrato' ? 'Contrato ' : 'Cotización ') + (seleccion()?.referencia ?? '')"
      eyebrow="Vista previa"
      tamano="xl"
      (cerrar)="seleccion.set(null)"
    >
      @if (seleccion(); as s) {
        <app-visor-archivo [archivo]="archivo()" [cargando]="cargandoArchivo()" [nombre]="s.referencia + '.pdf'" />
      }
    </app-modal-dialog>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: var(--space-3); }
    .hd-vacio { margin: 0; font-size: var(--text-body-sm); color: var(--sb-secondary); }
    .hd {
      border: 1px solid var(--sb-border);
      border-radius: var(--radius-xl);
      background: var(--sb-surface);
      box-shadow: var(--sb-shadow-1);
      overflow: hidden;
    }
    .hd__cab {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background: linear-gradient(180deg, var(--sb-surface-low), var(--sb-surface));
      cursor: pointer;
      list-style: none;
      user-select: none;
    }
    .hd__cab::-webkit-details-marker { display: none; }
    .hd__cab:focus-visible { outline: var(--focus-ring-width) solid var(--sb-primary); outline-offset: -2px; }
    .hd[open] > .hd__cab { border-bottom: 1px solid var(--sb-border); }
    .hd__icono {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex: none;
      border-radius: var(--radius-lg);
      background: var(--sb-tint-accent-bg);
      color: var(--sb-primary);
    }
    .hd__titulo {
      flex: 1;
      min-width: 0;
      font-family: var(--font-family-heading);
      font-size: var(--text-body);
      font-weight: var(--font-weight-bold);
      color: var(--sb-on-surface);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hd__conteo {
      flex: none;
      padding: 2px var(--space-2);
      border-radius: var(--radius-full);
      background: var(--sb-surface-low);
      border: 1px solid var(--sb-border);
      font-size: var(--text-caption);
      font-weight: var(--font-weight-semibold);
      color: var(--sb-secondary);
      font-variant-numeric: tabular-nums;
    }
    .hd__chevron { display: inline-flex; color: var(--sb-secondary); transition: transform 0.18s ease; }
    .hd:not([open]) .hd__chevron { transform: rotate(-90deg); }
    /* Mitad y mitad; en pantallas angostas una debajo de la otra. */
    .hd__tablas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
      padding: var(--space-4);
    }
    .hd__columna { min-width: 0; }
    .hd__subtitulo {
      margin: 0 0 var(--space-2);
      font-size: var(--text-body-sm);
      font-weight: var(--font-weight-bold);
      color: var(--sb-on-surface);
    }
    @media (max-width: 1024px) {
      .hd__tablas { grid-template-columns: 1fr; }
      .hd__conteo { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hd__chevron { transition: none; }
    }
  `,
})
export class HistorialDocumentalComponent implements OnInit {
  /** De dónde se lee el historial (el del broker o el de la consola). */
  readonly fuente = input.required<() => Observable<HistorialDocumental>>();
  /** PDF de un documento para la vista previa. */
  readonly descargar = input.required<(tipo: TipoDocumentoHistorial, referencia: string) => Observable<Blob>>();
  /** Consola: un colapsable por broker o prospecto. */
  readonly conBroker = input(false);
  /** Título del grupo único del broker. */
  readonly titulo = input('Mis contratos y cotizaciones');

  private readonly destroyRef = inject(DestroyRef);
  private readonly ruta = inject(ActivatedRoute);
  private readonly historial = signal<HistorialDocumental>({ contratos: [], cotizaciones: [] });
  protected readonly columnasContratos = COLUMNAS_CONTRATOS;
  protected readonly columnasCotizaciones = COLUMNAS_COTIZACIONES;
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly seleccion = signal<{ tipo: TipoDocumentoHistorial; referencia: string } | null>(null);
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);

  protected readonly grupos = computed<readonly Grupo[]>(() => {
    const h = this.historial();
    if (!this.conBroker()) {
      return [{ titulo: this.titulo(), contratos: h.contratos.map(filaContrato), cotizaciones: h.cotizaciones.map(filaCotizacion) }];
    }
    // El servidor los entrega del más reciente al más antiguo: el primer broker visto es el de actividad más reciente.
    const porBroker = new Map<string, { contratos: FilaTabla[]; cotizaciones: FilaTabla[] }>();
    const de = (broker: string) => {
      const clave = broker?.trim() || 'Sin broker';
      if (!porBroker.has(clave)) porBroker.set(clave, { contratos: [], cotizaciones: [] });
      return porBroker.get(clave)!;
    };
    h.contratos.forEach((c) => de(c.broker).contratos.push(filaContrato(c)));
    h.cotizaciones.forEach((c) => de(c.broker).cotizaciones.push(filaCotizacion(c)));
    return [...porBroker].map(([titulo, g]) => ({ titulo, ...g }));
  });

  ngOnInit(): void {
    this.cargar();
    // Ctrl+K estando ya en Documentos solo cambia `?q`: el componente no se recrea.
    this.ruta.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.cargando()) this.abrirBuscado();
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.fuente()()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (h) => {
          this.historial.set(h);
          this.cargando.set(false);
          this.abrirBuscado();
        },
        error: () => {
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  /** Llega desde el buscador de la barra superior (`?q=CTR-…`): abre la vista previa de ese documento. */
  private abrirBuscado(): void {
    const q = this.ruta.snapshot.queryParamMap.get('q');
    if (!q) return;
    const h = this.historial();
    if (h.contratos.some((c) => c.referencia === q)) this.abrir('contrato', q);
    else if (h.cotizaciones.some((c) => c.referencia === q)) this.abrir('cotizacion', q);
  }

  /** La tabla emite el índice en el arreglo original (no en el filtrado u ordenado). */
  protected ver(tipo: TipoDocumentoHistorial, filas: readonly FilaTabla[], evento: AccionFila): void {
    const referencia = String(filas.at(evento.indice)?.['referencia'] ?? '');
    if (referencia) this.abrir(tipo, referencia);
  }

  private abrir(tipo: TipoDocumentoHistorial, referencia: string): void {
    this.seleccion.set({ tipo, referencia });
    this.archivo.set(null);
    this.cargandoArchivo.set(true);
    this.descargar()(tipo, referencia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.archivo.set(b);
          this.cargandoArchivo.set(false);
        },
        error: () => this.cargandoArchivo.set(false),
      });
  }
}
