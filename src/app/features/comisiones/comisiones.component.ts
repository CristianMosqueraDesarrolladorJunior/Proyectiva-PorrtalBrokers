import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../core/services/catalogo.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';

import { CuentaCobroResponse, EstadoCobro, FilaCruda, PolizaExpedida, RevisionCuenta } from '../../core/models/comisiones.model';
import { ESTADOS_COBRO, esCobrable, etiquetaEstado, fechaCorta, filaPoliza, filtrarPolizas } from './comisiones-polizas';
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
import { FichaComponent, type SeccionFicha } from '../../shared/components/ficha/ficha.component';
import { ModalDialogComponent } from '../../shared/components/modal-dialog/modal-dialog.component';
import { FeedbackService } from '../../shared/services/feedback/feedback.service';
import { plural } from '../../core/util/plural';

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
    ModalDialogComponent,
    FichaComponent,
  ],
  templateUrl: './comisiones.component.html',
  styleUrl: './comisiones.component.scss',
})
export class ComisionesComponent {
  protected readonly plural = plural;
  private readonly feedback = inject(FeedbackService);
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
  protected readonly filasCrudas = signal<readonly FilaCruda[]>([]);

  // --- Pólizas a cobrar: tabla con filtros, orden, paginación, selección y detalle ---
  protected readonly polizas = signal<readonly PolizaExpedida[]>([]);
  protected readonly cargandoPolizas = signal(true);
  protected readonly errorPolizas = signal(false);
  protected readonly estadoFiltro = signal<EstadoCobro | ''>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly seleccionadas = signal<readonly string[]>([]);
  protected readonly detalle = signal<PolizaExpedida | null>(null);
  protected readonly estadosCobro = ESTADOS_COBRO;
  protected readonly hayFiltros = computed(() => !!this.estadoFiltro() || !!this.desde() || !!this.hasta());
  protected readonly polizasFiltradas = computed(() =>
    filtrarPolizas(this.polizas(), { estado: this.estadoFiltro(), desde: this.desde(), hasta: this.hasta() }),
  );
  protected readonly filasPolizas = computed<readonly FilaTabla[]>(() => this.polizasFiltradas().map(filaPoliza));
  protected readonly columnasPolizas: readonly ColumnaTabla[] = [
    { key: 'poliza', header: 'N° póliza', ordenable: true },
    { key: 'emision', header: 'Emisión', ordenable: true },
    { key: 'estado', header: 'Estado de pago', tipo: 'badge', ordenable: true },
    { key: 'comision', header: 'Comisión', alinear: 'derecha', ordenable: true },
    {
      key: 'ver',
      header: 'Detalle',
      tipo: 'acciones',
      acciones: [{ id: 'ver', etiqueta: 'Ver detalle', icono: 'visibility' }],
      alinear: 'derecha',
    },
  ];
  protected readonly pendientesCobro = computed(() => this.polizas().filter(esCobrable).length);
  protected readonly pagadas = computed(() => this.polizas().filter((p) => p.estadoPago === 'PAGADA').length);
  protected readonly otrasPolizas = computed(() => this.polizas().length - this.pendientesCobro() - this.pagadas());
  protected readonly limiteSuperado = computed(() => this.seleccionadas().length >= this.maximoFilas);
  protected readonly intento = signal(false);
  protected readonly generando = signal(false);
  protected readonly generada = signal<CuentaCobroResponse | null>(null);

  /** Revisión del servidor (reglas y comisión del acuerdo del broker); el front no calcula. */
  protected readonly revision = signal<RevisionCuenta>(REVISION_VACIA);
  protected readonly revisando = signal(false);
  /** Hay al menos una fila con datos: desde ahí se muestran los errores que devuelve el servidor. */
  protected readonly hayFilasEscritas = computed(() => this.filasCrudas().some((f) => f.poliza.trim() || f.valor.trim()));
  protected readonly puedeGenerar = computed(
    () => this.revision().errores.length === 0 && this.revision().filas.length > 0 && !this.generando() && !this.revisando(),
  );

  // --- Historial ---
  protected readonly historial = signal<readonly CuentaCobroResponse[]>([]);
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorHistorial = signal(false);

  protected readonly columnasHistorial: readonly ColumnaTabla[] = [
    { key: 'numero', header: 'N°', ordenable: true, nowrap: true },
    { key: 'fecha', header: 'Fecha', ordenable: true },
    { key: 'polizas', header: 'Pólizas', alinear: 'derecha' },
    { key: 'valor', header: 'Valor cobrado', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'Comisión', alinear: 'derecha', ordenable: true },
    { key: 'descargar', header: '', tipo: 'accion', textoAccion: 'Descargar PDF', alinear: 'derecha' },
  ];

  protected readonly filasHistorial = computed<readonly FilaTabla[]>(() =>
    this.historial().map((c) => ({
      numero: c.consecutivo,
      fecha: new Date(c.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
      polizas: c.polizas,
      valor: pesos(c.totalValor),
      comision: pesos(c.totalComision),
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
    this.cargarPolizas();
    toObservable(this.filasCrudas)
      .pipe(
        debounceTime(300),
        switchMap((filas) => {
          if (!filas.some((f) => f.poliza.trim() || f.valor.trim())) {
            return of(REVISION_VACIA);
          }
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

  // --- Selección de pólizas ---
  /** Elegir pólizas: arma las filas de la cuenta (valor pagado por el propietario) y el servidor las revisa. */
  protected alElegir(ids: readonly string[]): void {
    const permitidas = ids.slice(0, this.maximoFilas);
    this.seleccionadas.set(permitidas);
    const porNumero = new Map(this.polizas().map((p) => [p.numeroPoliza, p]));
    this.filasCrudas.set(
      permitidas.flatMap((id) => {
        const p = porNumero.get(id);
        return p ? [{ poliza: p.numeroPoliza, valor: String(p.valorPoliza) }] : [];
      }),
    );
  }

  protected limpiarSeleccion(): void {
    this.alElegir([]);
  }

  protected limpiarFiltros(): void {
    this.estadoFiltro.set('');
    this.desde.set('');
    this.hasta.set('');
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  /** «Ver detalle» de una fila: abre los datos de la póliza y de su pago. */
  protected verDetalle(evento: AccionFila): void {
    const poliza = this.polizasFiltradas().at(evento.indice);
    if (poliza) this.detalle.set(poliza);
  }

  protected readonly seccionesDetalle = computed<readonly SeccionFicha[]>(() => {
    const p = this.detalle();
    if (!p) return [];
    const monto = (v: number) => (v > 0 ? pesos(v) : '—');
    return [
      {
        titulo: 'Datos de la póliza',
        icono: 'policy',
        datos: [
          { etiqueta: 'N° de póliza', valor: p.numeroPoliza },
          { etiqueta: 'Fecha de emisión', valor: fechaCorta(p.fechaEmision) },
          { etiqueta: 'Valor pagado por el propietario', valor: monto(p.valorPoliza) },
          { etiqueta: 'Último día para cobrarla', valor: fechaCorta(p.fechaLimiteCobro) },
        ],
      },
      {
        titulo: 'Datos del pago',
        icono: 'payments',
        datos: [
          { etiqueta: 'Estado', valor: etiquetaEstado(p.estadoPago) },
          { etiqueta: 'Tu comisión', valor: monto(p.comision), destacado: true },
          { etiqueta: 'Porcentaje del acuerdo', valor: p.porcentaje > 0 ? `${p.porcentaje} %` : '—' },
          { etiqueta: 'Fecha de pago', valor: fechaCorta(p.fechaPago) },
          { etiqueta: 'Orden de pago / factura', valor: p.ordenPago || '—' },
        ],
      },
    ];
  });

  // --- Generar ---
  protected generar(): void {
    this.intento.set(true);
    if (!this.puedeGenerar()) return;
    this.generando.set(true);
    this.comisiones
      .generarCuenta({ filas: this.revision().filas.map((f) => ({ poliza: f.poliza, valor: f.valor })) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuenta) => {
          this.generando.set(false);
          this.generada.set(cuenta);
          // Aviso breve; la descarga queda en la misma tarjeta de la cuenta de cobro.
          this.feedback.toast({ variante: 'exito', mensaje: `Cuenta de cobro N° ${cuenta.consecutivo} generada.` });
          this.limpiarSeleccion();
          this.intento.set(false);
          this.cargarHistorial();
          this.cargarPolizas();
        },
        error: (err: unknown) => {
          this.generando.set(false);
          this.feedback.error({ titulo: 'No se pudo generar la cuenta', mensaje: mensajeErrorIntegracion(err) });
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
        error: (err: unknown) => this.feedback.error({ titulo: 'No se pudo generar la cuenta', mensaje: mensajeErrorIntegracion(err) }),
      });
  }

  protected irAMiPerfil(): void {
    void this.router.navigate(['/app/perfil']);
  }

  // --- Carga ---
  protected cargarPolizas(): void {
    this.cargandoPolizas.set(true);
    this.errorPolizas.set(false);
    this.comisiones
      .polizasExpedidas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.polizas.set(r);
          this.cargandoPolizas.set(false);
        },
        error: () => {
          this.polizas.set([]);
          this.errorPolizas.set(true);
          this.cargandoPolizas.set(false);
        },
      });
  }

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

  /** Estado vacío: el primer paso para tener pólizas es cotizar. */
  protected irACotizar(): void {
    void this.router.navigate(['/app/cotizador']);
  }
}
