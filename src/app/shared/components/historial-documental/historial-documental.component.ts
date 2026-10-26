import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type { Observable } from 'rxjs';

import type { HistorialDocumental } from '../../../core/services/documentos.service';
import { cop, fechaCorta } from '../../../core/services/admin.helpers';
import { DataTableComponent, type AccionFila, type ColumnaTabla, type FilaTabla } from '../data-table/data-table.component';
import { EstadoVistaComponent } from '../estado-vista/estado-vista.component';
import { GridLayoutComponent } from '../grid-layout/grid-layout.component';
import { ModalDialogComponent } from '../modal-dialog/modal-dialog.component';
import { VisorArchivoComponent } from '../visor-archivo/visor-archivo.component';

export type TipoDocumentoHistorial = 'contrato' | 'cotizacion';

const VER = { key: 'ver', header: '', tipo: 'accion', textoAccion: 'Vista previa', alinear: 'derecha' } as const;

/**
 * Historial documental: contratos (izquierda) y cotizaciones (derecha) en dos tablas con búsqueda, y la vista previa
 * del PDF en un modal. Lo usan Documentos del broker y la consola; cada uno pasa de dónde leer y cómo descargar.
 */
@Component({
  selector: 'app-historial-documental',
  standalone: true,
  imports: [DataTableComponent, EstadoVistaComponent, GridLayoutComponent, ModalDialogComponent, VisorArchivoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-estado-vista
      [cargando]="cargando()"
      [error]="error()"
      entidad="historial de documentos"
      (reintentar)="cargar()"
    >
      <app-grid-layout tipo="two-col">
        <div class="historial__columna">
          <h3 class="historial__titulo">Contratos</h3>
          <app-data-table
            [columnas]="columnasContratos()"
            [filas]="filasContratos()"
            [total]="filasContratos().length"
            [tamanoPagina]="10"
            [conBusqueda]="true"
            placeholderBusqueda="Buscar por referencia, propietario, inquilino o inmueble…"
            ariaLabel="Historial de contratos"
            mensajeVacio="Aún no hay contratos elaborados."
            (accion)="ver('contrato', $event)"
          />
        </div>
        <div class="historial__columna">
          <h3 class="historial__titulo">Cotizaciones</h3>
          <app-data-table
            [columnas]="columnasCotizaciones()"
            [filas]="filasCotizaciones()"
            [total]="filasCotizaciones().length"
            [tamanoPagina]="10"
            [conBusqueda]="true"
            placeholderBusqueda="Buscar por referencia, ciudad o inmueble…"
            ariaLabel="Historial de cotizaciones"
            mensajeVacio="Aún no hay cotizaciones."
            (accion)="ver('cotizacion', $event)"
          />
        </div>
      </app-grid-layout>
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
    .historial__columna { min-width: 0; }
    .historial__titulo {
      margin: var(--space-0) var(--space-0) var(--space-2);
      font-size: var(--text-body);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }
  `,
})
export class HistorialDocumentalComponent implements OnInit {
  /** De dónde se lee el historial (el del broker o el de la consola). */
  readonly fuente = input.required<() => Observable<HistorialDocumental>>();
  /** PDF de un documento para la vista previa. */
  readonly descargar = input.required<(tipo: TipoDocumentoHistorial, referencia: string) => Observable<Blob>>();
  /** Consola: muestra el broker de cada documento. */
  readonly conBroker = input(false);

  private readonly destroyRef = inject(DestroyRef);
  private readonly ruta = inject(ActivatedRoute);
  private readonly historial = signal<HistorialDocumental>({ contratos: [], cotizaciones: [] });
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly seleccion = signal<{ tipo: TipoDocumentoHistorial; referencia: string } | null>(null);
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);

  private readonly broker = computed<readonly ColumnaTabla[]>(() =>
    this.conBroker() ? [{ key: 'broker', header: 'Broker', ordenable: true }] : [],
  );

  protected readonly columnasContratos = computed<readonly ColumnaTabla[]>(() => [
    { key: 'referencia', header: 'Contrato', tipo: 'principal', ordenable: true, nowrap: true },
    { key: 'partes', header: 'Propietario / inquilino', tipo: 'principal' },
    ...this.broker(),
    { key: 'fecha', header: 'Elaborado', ordenable: true, nowrap: true },
    VER,
  ]);

  protected readonly columnasCotizaciones = computed<readonly ColumnaTabla[]>(() => [
    { key: 'referencia', header: 'Cotización', tipo: 'principal', ordenable: true, nowrap: true },
    { key: 'inmueble', header: 'Inmueble', tipo: 'principal' },
    ...this.broker(),
    { key: 'total', header: 'Total', alinear: 'derecha', ordenable: true, nowrap: true },
    { key: 'fecha', header: 'Fecha', ordenable: true, nowrap: true },
    VER,
  ]);

  protected readonly filasContratos = computed<readonly FilaTabla[]>(() =>
    this.historial().contratos.map((c) => ({
      referencia: c.referencia,
      referenciaSub: c.radicado ? `Solicitud ${c.radicado}` : 'Sin solicitud de póliza',
      partes: c.propietario ?? '—',
      partesSub: [c.inquilino, c.inmueble].filter(Boolean).join(' · '),
      broker: c.broker,
      fecha: fechaCorta(c.fecha),
      fechaOrden: c.fecha,
      ver: '',
    })),
  );

  protected readonly filasCotizaciones = computed<readonly FilaTabla[]>(() =>
    this.historial().cotizaciones.map((c) => ({
      referencia: c.referencia,
      referenciaSub: c.contrato ? `Contrato ${c.contrato}` : '',
      inmueble: c.tipoInmueble ?? '—',
      inmuebleSub: c.ciudad ?? '',
      broker: c.broker,
      total: cop(c.total ?? 0),
      totalOrden: c.total ?? 0,
      fecha: fechaCorta(c.fecha),
      fechaOrden: c.fecha,
      ver: '',
    })),
  );

  ngOnInit(): void {
    this.cargar();
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
    const contrato = this.filasContratos().findIndex((f) => f['referencia'] === q);
    if (contrato >= 0) {
      this.ver('contrato', { indice: contrato, columna: 'ver' });
      return;
    }
    const cotizacion = this.filasCotizaciones().findIndex((f) => f['referencia'] === q);
    if (cotizacion >= 0) this.ver('cotizacion', { indice: cotizacion, columna: 'ver' });
  }

  /** La tabla emite el índice en el arreglo original (no en el filtrado u ordenado). */
  protected ver(tipo: TipoDocumentoHistorial, evento: AccionFila): void {
    const filas = tipo === 'contrato' ? this.filasContratos() : this.filasCotizaciones();
    const referencia = String(filas.at(evento.indice)?.['referencia'] ?? '');
    if (!referencia) return;
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
