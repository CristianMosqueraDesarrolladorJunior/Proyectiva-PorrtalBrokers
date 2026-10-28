import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  FiltradoInteligenteComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
} from '../../../../shared/components';
import type {
  AccionFila,
  ColumnaTabla,
  SeccionFicha,
} from '../../../../shared/components';
import type { CondicionesRenovacion } from '../../../../core/models/renovacion.model';
import {
  RenovacionService,
  type PortafolioRenovaciones,
} from '../../../../core/services/renovacion.service';
import type { Poliza } from '../../../../core/models/poliza.model';
import { cop, fechaCorta } from '../../../../core/services/admin.helpers';
import { seccionesDatosRenovacion, type DatosRenovacion } from '../../../../core/util/datos-renovacion';
import { SITUACION, accionDe, accionRenovacion, ordenarPorUrgencia } from '../../renovaciones-lista';


/**
 * RenovacionesComponent — Gestión de Renovaciones (Req 16, 17).
 *
 * Página principal del feature: muestra los KPIs del portafolio (total,
 * renovadas, próximas a renovar, a punto de vencer), un buscador por cédula y
 * el listado de pólizas reutilizando el `DataTableComponent`. Al seleccionar una
 * póliza (fila o acción "Gestionar"), navega al flujo de Renovacion (Req 16.4).
 *
 * Consume `RenovacionService.portafolio()` (API real). La presentación no
 * realiza cálculo autoritativo.
 */
@Component({
  selector: 'app-renovaciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BadgeEstadoComponent,
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FiltradoInteligenteComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
  ],
  templateUrl: './renovaciones.component.html',
  styleUrl: './renovaciones.component.scss',
})
export class RenovacionesComponent {
  private readonly renovacionService = inject(RenovacionService);
  private readonly router = inject(Router);

  /** Portafolio de pólizas y conteos por estado (Req 17). */
  protected readonly portafolio = signal<PortafolioRenovaciones | null>(null);

  /** Indica si el portafolio se está cargando. */
  protected readonly cargando = signal(true);

  /** Falló la carga del portafolio (la vista ofrece reintentar). */
  protected readonly error = signal(false);

  /** Texto del buscador: filtra por número de póliza en el portafolio cargado. */
  protected readonly busqueda = signal('');

  /** Filtro por situación (la acción de la regla única); vacío = todas. */
  protected readonly estadoFiltro = signal('');
  protected readonly situaciones = Object.entries(SITUACION).map(([valor, s]) => ({ valor, etiqueta: s.texto }));
  /** Rango de vencimiento (AAAA-MM-DD). */
  protected readonly venceDesde = signal('');
  protected readonly venceHasta = signal('');

  /** Pólizas que coinciden con la búsqueda y los filtros, de la más urgente a la menos urgente. */
  private readonly polizasVisibles = computed(() => {
    const polizas = this.portafolio()?.polizas ?? [];
    const q = this.busqueda().trim().toLowerCase();
    const situacion = this.estadoFiltro();
    const desde = this.venceDesde();
    const hasta = this.venceHasta();
    return ordenarPorUrgencia(
      polizas.filter((p) => {
        const vence = String(p.fechaVencimiento).slice(0, 10);
        return (!q || p.numero.toLowerCase().includes(q) || (p.estadoWarehouse ?? '').toLowerCase().includes(q))
          && (!situacion || accionDe(p) === situacion)
          && (!desde || vence >= desde) && (!hasta || vence <= hasta);
      }),
    );
  });

  protected readonly hayFiltros = computed(
    () => !!this.busqueda().trim() || !!this.estadoFiltro() || !!this.venceDesde() || !!this.venceHasta(),
  );

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoFiltro.set('');
    this.venceDesde.set('');
    this.venceHasta.set('');
  }

  /** Columnas del DataTable de pólizas, con sort, insignia y acción (Req 16.2, 16.3). */
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'numero', header: 'Póliza', ordenable: true },
    { key: 'fechaVencimiento', header: 'Vence', ordenable: true },
    { key: 'situacion', header: 'Situación', tipo: 'badge', ordenable: true },
    { key: 'gestion', header: 'Estado del área', tipo: 'principal', ordenable: true },
    { key: 'pago', header: 'Pago', ordenable: true },
    { key: 'gestionar', header: '', tipo: 'accion', textoAccion: 'Renovar', alinear: 'derecha' },
  ];

  /** Filas: la situación sale de la acción del backend (regla única); el botón solo gestiona lo pendiente. */
  protected readonly filas = computed(() => {
    const polizas = this.polizasVisibles();
    return polizas.map((p) => {
      const situacion = SITUACION[accionDe(p)];
      return {
        numero: p.numero,
        fechaVencimiento: fechaCorta(p.fechaVencimiento),
        fechaVencimientoOrden: p.fechaVencimiento,
        situacion: situacion.texto,
        situacionVariante: situacion.variante,
        gestion: p.gestion ?? 'Sin gestión aún',
        gestionSub: p.estadoWarehouse ?? '',
        pago: p.pagada ? 'Pagada' : p.estado === 'RENOVADA' ? 'Sin recaudo aún' : '—',
        gestionar: '',
        gestionarTexto: 'Ver detalle',
      };
    });
  });

  constructor() {
    this.cargar();
    // Llega desde el buscador de la barra superior con el número de póliza.
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((p) => {
        const q = p.get('q');
        if (q) this.busqueda.set(q);
      });
  }

  /** Carga el portafolio de renovaciones desde el backend (Req 17). */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.renovacionService.portafolio().subscribe({
      next: (portafolio) => {
        this.portafolio.set(portafolio);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  /** Ficha de la póliza: se abre al elegir la fila; desde ahí se renueva solo si aplica. */
  protected readonly fechaCorta = fechaCorta;
  protected readonly seleccionada = signal<Poliza | null>(null);
  protected readonly condiciones = signal<CondicionesRenovacion | null>(null);
  protected readonly situacion = computed(() => {
    const p = this.seleccionada();
    return p ? SITUACION[accionDe(p)] : null;
  });
  /** Texto del botón de la ficha; `null` cuando la póliza solo se consulta. */
  protected readonly textoAccion = computed(() => {
    const p = this.seleccionada();
    if (!p) return null;
    const accion = accionDe(p);
    return accion === 'RENOVAR' ? 'Renovar póliza' : accion === 'CORREGIR' ? 'Corregir documentos'
      : accion === 'INDUCCION' ? 'Iniciar inducción' : null;
  });
  protected readonly notaSinAccion = computed(() => {
    const p = this.seleccionada();
    if (!p) return '';
    switch (accionDe(p)) {
      case 'EN_PROCESO':
        return 'El área ya está gestionando esta renovación. Te avisamos cuando cambie.';
      case 'FUERA_PLAZO':
        return 'Venció hace más de 11 meses: ya no se puede renovar ni hacer inducción. Para asegurarla de nuevo, cotiza una póliza nueva.';
      case 'CERRADA':
        return p.estado === 'RENOVADA'
          ? (p.pagada ? 'Ya está renovada y la nueva vigencia está pagada.' : 'Ya está renovada; el pago de la nueva vigencia aún no aparece.')
          : 'El área la cerró sin renovar. Si crees que hay un error, escríbele a tu asesor comercial.';
      default:
        return '';
    }
  });
  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const p = this.seleccionada();
    if (!p) return [];
    const c = this.condiciones();
    return [
      // Sin el JSON de la hoja se muestra lo básico; con él, «Detalle de la póliza» y «Contacto del asegurado» ya lo traen.
      ...(this.datosWarehouse() ? [] : [
      {
        titulo: 'Póliza de arrendamiento',
        icono: 'policy',
        datos: [
          { etiqueta: 'Número', valor: p.numero },
          { etiqueta: 'Producto', valor: c?.destino ? `${p.producto} · ${c.destino}` : p.producto },
          { etiqueta: 'Inicio de vigencia', valor: c?.vigencia ? fechaCorta(c.vigencia) : null },
          { etiqueta: 'Vencimiento', valor: fechaCorta(c?.vencimiento ?? p.fechaVencimiento) },
          { etiqueta: 'Canon', valor: c ? cop(c.canon) : null, destacado: true },
          { etiqueta: 'Administración', valor: c ? cop(c.administracion) : null },
        ],
      },
      {
        titulo: 'Asegurado',
        icono: 'person',
        datos: [{ etiqueta: 'Nombre', valor: c?.asegurado ?? p.cliente ?? null, ancho: true }],
      },
      ]),
      // Todo el registro de la póliza en el Warehouse (hoja JSON).
      ...seccionesDatosRenovacion(this.datosWarehouse()),
      {
        titulo: 'Gestión',
        icono: 'assignment',
        datos: [
          { etiqueta: 'Situación', valor: SITUACION[accionDe(p)].texto },
          { etiqueta: 'Estado del área', valor: p.estadoWarehouse || p.gestion || 'Sin gestión aún' },
          { etiqueta: 'Corrección pedida por el área', valor: c?.motivoCorreccion ?? null, ancho: true },
        ],
      },
    ];
  });

  /** Registro completo de la póliza en el Warehouse; se pide al abrir la ficha. */
  protected readonly datosWarehouse = signal<DatosRenovacion | null>(null);

  /** Abre la ficha de la póliza elegida (fila o botón «Ver detalle»). */
  protected onSeleccionFila(indice: number): void {
    const poliza = this.polizasVisibles()[indice];
    if (!poliza) return;
    this.seleccionada.set(poliza);
    this.condiciones.set(null);
    this.renovacionService.condiciones(poliza.numero).subscribe({
      next: (c) => this.condiciones.set(c),
      error: () => this.condiciones.set(null),
    });
    this.datosWarehouse.set(null);
    this.renovacionService.datos(poliza.numero).subscribe({
      next: (d) => this.datosWarehouse.set(d),
      error: () => this.datosWarehouse.set(null),
    });
  }

  protected cerrarFicha(): void {
    this.seleccionada.set(null);
  }

  /** Botón de la ficha: renovar, corregir o inducción (solo si la regla lo permite). */
  protected gestionarSeleccionada(): void {
    const p = this.seleccionada();
    if (p && this.textoAccion()) {
      this.iniciarRenovacion(p);
    }
  }

  /** Gestiona la póliza desde el botón de la columna de acción (Req 16.4). */
  protected onGestionar(evento: AccionFila): void {
    this.onSeleccionFila(evento.indice);
  }

  /**
   * Navega al flujo de Renovacion conservando el número de póliza (Req 16.4). Una póliza vencida
   * ya no se renueva: va a la inducción.
   */
  private iniciarRenovacion(poliza: Poliza): void {
    if (accionDe(poliza) === 'INDUCCION') {
      void this.router.navigate(['/app/renovaciones/induccion'], { queryParams: { poliza: poliza.numero } });
      return;
    }
    void this.router.navigate(['/app/renovaciones/detalle'], {
      queryParams: { numeroPolizaInicial: poliza.numero },
    });
  }

  /** Estado vacío: el primer paso para tener pólizas es cotizar. */
  protected irACotizar(): void {
    void this.router.navigate(['/app/cotizador']);
  }
}
