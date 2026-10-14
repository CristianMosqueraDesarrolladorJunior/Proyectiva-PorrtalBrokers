import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../core/services/catalogo.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';

import { CuentaCobroResponse, FilaCruda, RevisionCuenta } from '../../core/models/comisiones.model';
import { ComisionesService } from '../../core/services/comisiones.service';
import { ComisionesResponse, DashboardService } from '../../core/services/dashboard.service';
import { PerfilService } from '../../core/services/perfil.service';
import { mensajeErrorIntegracion } from '../../core/util/errores-integracion';
import { descargarArchivo } from '../../core/util/descargar-archivo';
import { aEntero, enLetrasPesos, pesos } from '../../core/util/numeros-letras';
import {
  AlertBannerComponent,
  BotonComponent,
  CommissionBreakdownCardComponent,
  DataTableComponent,
  EmptyStateComponent,
  EstadoVistaComponent,
  FormFieldComponent,
  FormSectionCardComponent,
  GridLayoutComponent,
  KpiCardComponent,
  LayoutResumenComponent,
  MoneyInputComponent,
  PageHeaderComponent,
  SummaryCardComponent,
} from '../../shared/components';
import type { AccionFila, ColumnaTabla, FilaResumen, FilaTabla } from '../../shared/components';

/**
 * Comisiones del broker REGISTRADO: valor estimado del periodo y la cuenta de cobro.
 *
 * La cuenta se previsualiza en vivo con las mismas reglas del área (valor sin IVA × 20 % o 25 %,
 * pólizas de 13 dígitos, máx. 20) y se genera en el servidor, que recalcula todo con el porcentaje
 * del broker de la sesión. El prospecto ve el módulo bloqueado (el backend además responde 403).
 */
const REVISION_VACIA: RevisionCuenta = { filas: [], errores: [], avisos: [], totalValor: 0, totalComision: 0 };

@Component({
  selector: 'app-comisiones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BotonComponent,
    CommissionBreakdownCardComponent,
    DataTableComponent,
    EmptyStateComponent,
    EstadoVistaComponent,
    FormFieldComponent,
    FormSectionCardComponent,
    GridLayoutComponent,
    KpiCardComponent,
    LayoutResumenComponent,
    MoneyInputComponent,
    PageHeaderComponent,
    SummaryCardComponent,
  ],
  templateUrl: './comisiones.component.html',
  styleUrl: './comisiones.component.scss',
})
export class ComisionesComponent {
  private readonly comisiones = inject(ComisionesService);
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly perfil = inject(PerfilService);

  protected readonly bloqueado = computed(() => this.perfil.estadoCuenta() === 'PROSPECTO');
  private readonly catalogo = inject(CatalogoService);

  /** Plataforma de proveedores de Seguros Bolívar donde el broker carga la cuenta de cobro (catálogo `contacto_ayuda`). */
  protected readonly proveedores = this.catalogo.opciones('contacto_ayuda').find((c) => c.codigo === 'PROVEEDORES');
  protected readonly maximoFilas = this.catalogo.parametro('CUENTA_COBRO_MAX_FILAS');
  protected readonly plazoCobroMeses = this.catalogo.parametro('COMISION_PLAZO_COBRO_MESES');
  protected readonly pesos = pesos;

  // --- Periodo y acuerdo ---
  protected readonly periodo = signal<ComisionesResponse | null>(null);
  protected readonly porcentaje = signal(this.catalogo.parametro('COMISION_PORCENTAJE_DEFECTO'));
  protected readonly porcentajeConfirmado = signal(false);

  // --- Cuenta de cobro en edición ---
  protected readonly filasCrudas = signal<readonly FilaCruda[]>([{ poliza: '', valor: '' }]);
  protected readonly intento = signal(false);
  protected readonly generando = signal(false);
  protected readonly errorEnvio = signal('');
  protected readonly generada = signal<CuentaCobroResponse | null>(null);

  /** Revisión del servidor (reglas y comisión del acuerdo del broker); el front no calcula. */
  protected readonly revision = signal<RevisionCuenta>(REVISION_VACIA);
  protected readonly revisando = signal(false);
  protected readonly puedeGenerar = computed(
    () => this.revision().errores.length === 0 && this.revision().filas.length > 0 && !this.generando() && !this.revisando(),
  );

  // --- Historial ---
  protected readonly historial = signal<readonly CuentaCobroResponse[]>([]);
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorHistorial = signal(false);

  protected readonly columnasHistorial: readonly ColumnaTabla[] = [
    { key: 'fecha', header: 'Fecha', ordenable: true },
    { key: 'polizas', header: 'Pólizas', alinear: 'derecha' },
    { key: 'valor', header: 'Valor cobrado', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'Comisión', alinear: 'derecha', ordenable: true },
    { key: 'estado', header: 'Envío', tipo: 'badge' },
    { key: 'descargar', header: '', tipo: 'accion', textoAccion: 'Descargar PDF', alinear: 'derecha' },
  ];

  protected readonly filasHistorial = computed<readonly FilaTabla[]>(() =>
    this.historial().map((c) => ({
      fecha: new Date(c.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
      polizas: c.polizas,
      valor: pesos(c.totalValor),
      comision: pesos(c.totalComision),
      estado: c.enviada ? 'Enviada al área' : 'Pendiente de envío',
      estadoVariante: c.enviada ? 'success' : 'warning',
    })),
  );

  // --- Resumen lateral (summary-card) ---
  protected readonly resumenPrincipal = computed(() => ({
    label: 'Comisión a cobrar',
    valor: pesos(this.revision().totalComision),
  }));

  protected readonly resumenFilas = computed<readonly FilaResumen[]>(() => {
    const r = this.revision();
    return [
      { label: 'Pólizas', valor: `${r.filas.length} de ${this.maximoFilas}` },
      { label: 'Valor pagado (con IVA)', valor: pesos(r.totalValor) },
      { label: 'Base sin IVA', valor: pesos(r.filas.reduce((t, f) => t + f.neto, 0)) },
      { label: 'Tu porcentaje', valor: `${this.porcentaje()} %${this.porcentajeConfirmado() ? '' : ' (estimado)'}` },
    ];
  });

  protected readonly enLetras = computed(() => enLetrasPesos(this.revision().totalComision));

  constructor() {
    if (this.bloqueado()) {
      return;
    }
    this.cargarPeriodo();
    this.cargarAcuerdo();
    this.cargarHistorial();
    toObservable(this.filasCrudas)
      .pipe(
        debounceTime(300),
        switchMap((filas) => {
          this.revisando.set(true);
          return this.comisiones
            .revisarCuenta({
              filas: filas.map((f) => ({ poliza: f.poliza.replace(/\D/g, '').slice(0, 20), valor: aEntero(f.valor) })),
            })
            .pipe(catchError(() => of({ ...REVISION_VACIA, errores: ['No se pudo revisar la cuenta. Intenta de nuevo.'] })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => {
        this.revisando.set(false);
        this.revision.set(r);
      });
  }

  // --- Filas ---
  protected comisionFila(indice: number): string {
    const cruda = this.filasCrudas()[indice];
    const fila = this.revision().filas.find((f) => f.poliza === cruda.poliza.replace(/\D/g, ''));
    return fila ? pesos(fila.comision) : '—';
  }

  protected actualizarFila(indice: number, campo: keyof FilaCruda, valor: string): void {
    this.filasCrudas.update((filas) => filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected agregarFila(): void {
    if (this.filasCrudas().length >= this.maximoFilas) return;
    this.filasCrudas.update((filas) => [...filas, { poliza: '', valor: '' }]);
  }

  protected quitarFila(indice: number): void {
    this.filasCrudas.update((filas) => (filas.length === 1 ? [{ poliza: '', valor: '' }] : filas.filter((_, i) => i !== indice)));
  }

  // --- Generar ---
  protected generar(): void {
    this.intento.set(true);
    this.errorEnvio.set('');
    if (!this.puedeGenerar()) return;
    this.generando.set(true);
    this.comisiones
      .generarCuenta({ filas: this.revision().filas.map((f) => ({ poliza: f.poliza, valor: f.valor })) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuenta) => {
          this.generando.set(false);
          this.generada.set(cuenta);
          this.filasCrudas.set([{ poliza: '', valor: '' }]);
          this.intento.set(false);
          this.cargarHistorial();
        },
        error: (err: unknown) => {
          this.generando.set(false);
          this.errorEnvio.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected onAccionHistorial(evento: AccionFila): void {
    const cuenta = this.historial().at(evento.indice);
    if (cuenta) this.descargar(cuenta.id);
  }

  protected descargar(id: string): void {
    this.comisiones
      .descargarPdf(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => descargarArchivo(blob, `cuenta-de-cobro-${id}.pdf`),
        error: (err: unknown) => this.errorEnvio.set(mensajeErrorIntegracion(err)),
      });
  }

  protected irAMiPerfil(): void {
    void this.router.navigate(['/app/perfil']);
  }

  // --- Carga ---
  private cargarPeriodo(): void {
    this.dashboard
      .obtenerComisiones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.periodo.set(c), error: () => this.periodo.set(null) });
  }

  private cargarAcuerdo(): void {
    this.comisiones
      .obtenerAcuerdo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.porcentaje.set(a.porcentaje);
          this.porcentajeConfirmado.set(true);
        },
        // Sin acuerdo confirmado se previsualiza con el 20 %: el servidor liquida con el real.
        error: () => this.porcentajeConfirmado.set(false),
      });
  }

  protected cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(false);
    this.comisiones
      .listarCuentas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuentas) => {
          this.historial.set(cuentas);
          this.cargandoHistorial.set(false);
        },
        error: () => {
          this.historial.set([]);
          this.cargandoHistorial.set(false);
          this.errorHistorial.set(true);
        },
      });
  }
}
