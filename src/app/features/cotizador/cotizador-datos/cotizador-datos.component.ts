import { descargarArchivo } from '../../../core/util/descargar-archivo';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import {
  BotonComponent,
  FormFieldComponent,
  GridLayoutComponent,
  ToggleSwitchComponent,
  AlertBannerComponent,
  PageHeaderComponent,
  GuaranteeBadgeComponent,
  FormSectionCardComponent,
  SegmentedControlComponent,
  MoneyInputComponent,
  SummaryCardComponent,
  SkeletonComponent,
  ModalDialogComponent,
} from '../../../shared/components';
import type { OpcionSegmentada, FilaResumen } from '../../../shared/components';
import { formatearCop } from '../../../shared/util/moneda';
import { CotizadorResultadoComponent } from '../components/cotizador-resultado/cotizador-resultado.component';
import {
  CoberturasService,
  type CoberturaCatalogo,
} from '../../../core/services/coberturas.service';
import { CotizadorService } from '../../../core/services/cotizador.service';
import { BorradorRadicacionService } from '../../../core/services/borrador-radicacion.service';
import type {
  CoberturaSeleccion,
  CotizacionRequest,
  CotizacionResult,
} from '../../../core/models/cotizacion.model';
import { validarCanon } from '../canon-validacion';
import {
  departamentoBloqueado,
  estadoCobertura,
  MENSAJE_DEPARTAMENTO_BLOQUEADO,
  MENSAJE_CIUDAD_SIN_COBERTURA,
} from '../cobertura-ciudades';
import {
  decrementarMonto,
  incrementarMonto,
  normalizarMonto,
} from '../../../shared/util/monto-escalonado';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { SessionService } from '../../../core/services/session.service';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

/** Código del destino que habilita asegurar el IVA del canon (catálogo `destino_inmueble`). */
const CODIGO_COMERCIO = 'COMERCIO';

/** Fecha de hoy (YYYY-MM-DD, hora local) como inicio de vigencia por defecto. */
function hoyIso(): string {
  const d = new Date();
  const dos = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Iconografía Material Symbols por destino de inmueble y por cobertura (solo presentación). */
const ICONO_TIPO_INMUEBLE: Readonly<Record<string, string>> = {
  VIVIENDA: 'home',
  COMERCIO: 'storefront',
};

/** Iconografía por código de cobertura del catálogo oficial (cat_cobertura). */
const ICONO_COBERTURA: Readonly<Record<string, string>> = {
  DANOS_FALTANTES: 'handyman',
  SERVICIOS_PUBLICOS: 'bolt',
  RESPONSABILIDAD_CIVIL: 'gavel',
  DESEMPLEO: 'work_off',
};

/** Servicios públicos incluidos sin costo; espejo de `TarifaParametros.EXENCION_SERVICIOS_*` del backend. */
const CODIGO_SERVICIOS = 'SERVICIOS_PUBLICOS';
const OBSEQUIO_SERVICIOS_VIVIENDA = 1_000_000;
const OBSEQUIO_SERVICIOS_COMERCIO = 2_000_000;

/** Estado interactivo de una cobertura en el formulario (Req 7.5, 7.6). */
interface CoberturaEstado {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  activa: boolean;
  montoAsegurado: number;
}

/**
 * CotizadorDatosComponent — entrada de datos y coberturas del Cotizador (Req 7).
 *
 * Captura departamento, ciudad, tipo de inmueble, canon, administración
 * (opcional), fecha de inicio de vigencia y meses de vigencia (1–36) (Req 7.1),
 * reutilizando los Componentes_Compartidos `FormFieldComponent`, `BotonComponent`,
 * `CardComponent`, `GridLayoutComponent`, `ToggleSwitchComponent` y
 * `AlertBannerComponent`. Los estilos se resuelven solo con Design_Token (Req 25).
 *
 * Comportamiento (toda la lógica autoritativa reside en el backend; aquí es UX):
 * - Al seleccionar departamento, consulta las ciudades cubiertas al API_Backend
 *   (`CotizadorService.ciudadesPorDepartamento`) y las filtra con la lógica pura
 *   `estadoCobertura`; si el departamento no tiene ciudades, muestra
 *   "Ciudad no disponible en cobertura" e impide el cálculo (Req 7.2, 7.3).
 * - Cada cobertura usa `ToggleSwitchComponent` para activarse; al activarla se
 *   habilita el control de monto (pasos de $500.000, mínimo $0, sin negativos)
 *   mediante `incrementarMonto`/`decrementarMonto`/`normalizarMonto` (Req 7.5, 7.6).
 * - Valida el canon con `validarCanon` (numérico > 0) antes de permitir el cálculo
 *   e indica el campo inválido (Req 7.7, 7.8).
 *
 * Emite el `CotizacionRequest` armado mediante `calcular` cuando la entrada es
 * válida; el contenedor del Cotizador (task 9.5) solicita el cálculo autoritativo.
 */
@Component({
  selector: 'app-cotizador-datos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    BotonComponent,
    FormFieldComponent,
    GridLayoutComponent,
    ToggleSwitchComponent,
    AlertBannerComponent,
    CotizadorResultadoComponent,
    PageHeaderComponent,
    GuaranteeBadgeComponent,
    FormSectionCardComponent,
    SegmentedControlComponent,
    MoneyInputComponent,
    SummaryCardComponent,
    SkeletonComponent,
    ModalDialogComponent,
  ],
  templateUrl: './cotizador-datos.component.html',
  styleUrl: './cotizador-datos.component.scss',
})
export class CotizadorDatosComponent implements OnInit {
  private readonly feedback = inject(FeedbackService);
  private readonly coberturasService = inject(CoberturasService);
  private readonly catalogo = inject(CatalogoService);
  private readonly cotizadorService = inject(CotizadorService);
  private readonly router = inject(Router);
  private readonly borrador = inject(BorradorRadicacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(SessionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Resultado de la Cotizacion recibido del backend; `null` mientras no exista (Req 8.1, 9.4). */
  protected readonly resultado = signal<CotizacionResult | null>(null);

  /** Verdadero mientras se solicita el cálculo al backend (Req 8.7). */
  protected readonly calculando = signal(false);

  /** Verdadero mientras se genera el PDF (Req 9.1). */
  protected readonly descargandoPdf = signal(false);

  /** Departamentos con ciudades en cobertura (catálogo `ciudad`); los bloqueados (Antioquia) no se ofrecen. */
  protected readonly departamentos = computed(() => [
    ...new Set(this.catalogo.opciones('ciudad').map((c) => String(c['departamento'] ?? '')).filter((d) => d && !departamentoBloqueado(d))),
  ]);
  /** Vigencias y montos del Motor_Tarifas (`parametro_negocio`). */
  protected readonly mesesMin = this.catalogo.parametro('VIGENCIA_MIN_MESES');
  protected readonly mesesMax = this.catalogo.parametro('VIGENCIA_MAX_MESES');
  private readonly mesesDefecto = this.catalogo.parametro('VIGENCIA_DEFECTO_MESES');
  private readonly montoMaximoCobertura = this.catalogo.parametro('MONTO_MAX_COBERTURA');
  protected readonly mensajeSinCobertura = MENSAJE_CIUDAD_SIN_COBERTURA;
  protected readonly mensajeDepartamentoBloqueado = MENSAJE_DEPARTAMENTO_BLOQUEADO;

  /** Destinos del inmueble (catálogo `destino_inmueble`: Vivienda / Comercio). */
  private readonly destinos = this.catalogo.opciones('destino_inmueble');
  private readonly tipoInmuebleDefecto = this.destinos[0]?.descripcion ?? '';
  private readonly tipoComercio = this.destinos.find((d) => d.codigo === CODIGO_COMERCIO)?.descripcion;

  /** Opciones del selector segmentado de tipo de inmueble (catálogo real). */
  protected readonly opcionesTipo: readonly OpcionSegmentada[] = this.destinos.map((d) => ({
    valor: d.descripcion,
    etiqueta: d.descripcion,
    icono: ICONO_TIPO_INMUEBLE[d.codigo] ?? 'home_work',
  }));

  /** Vigencias permitidas por el Motor_Tarifas: mínima y máxima del parámetro. */
  protected readonly opcionesVigencia: readonly OpcionSegmentada[] = [...new Set([this.mesesMin, this.mesesMax])]
    .filter((m) => Number.isFinite(m))
    .map((m) => ({ valor: String(m), etiqueta: `${m} meses` }));

  /** Avance del flujo completo (el cotizador es el paso 1; el resto ocurre en Radicación). */
  protected readonly pasosFlujo: readonly string[] = ['Inmueble', 'Propietario', 'Documentos', 'Confirmación'];

  /** Opciones del selector Sí/No de administración. */
  protected readonly opcionesSiNo: readonly OpcionSegmentada[] = [
    { valor: 'no', etiqueta: 'No' },
    { valor: 'si', etiqueta: 'Sí' },
  ];

  /** ¿Tiene cuota de administración? Habilita el campo del valor de administración. */
  protected readonly tieneAdmin = signal<'si' | 'no'>('no');

  /** Cobertura cuyo detalle se muestra en el modal (null = cerrado). */
  protected readonly detalleAbierto = signal<string | null>(null);

  protected readonly detalleActual = computed(() => {
    const id = this.detalleAbierto();
    const cobertura = this.coberturas().find((c) => c.id === id);
    const item = this.catalogo.opciones('cobertura').find((c) => c.codigo === id);
    return cobertura && item?.['detalle']
      ? {
          nombre: cobertura.nombre,
          parrafos: String(item['detalle']).split('\n'),
          destacado: String(item['destacado'] ?? ''),
        }
      : null;
  });

  protected readonly notaTasas = this.catalogo.texto('NOTA_TASAS_COTIZADOR');
  /** Escalón del monto asegurado (`PASO_MONTO_COBERTURA`). */
  private readonly pasoMonto = this.catalogo.parametro('PASO_MONTO_COBERTURA');
  protected readonly cop = formatearCop;

  /** Comisión estimada tal como la informa el backend (el front no la calcula). */
  protected readonly comisionEstimada = computed(() => this.resultado()?.comisionEstimada ?? null);

  protected readonly resumenDestacado = computed(() => {
    const comision = this.comisionEstimada();
    return comision === null
      ? null
      : {
          label: 'Tu comisión estimada',
          valor: formatearCop(comision),
          // Auditoría de producción CZ1: el prospecto aún no puede cobrarla.
          nota:
            this.session.perfil()?.estadoCuenta === 'PROSPECTO'
              ? 'Es una estimación: la podrás cobrar cuando seas broker registrado.'
              : 'Es una estimación: la comisión final la confirmamos al expedir la póliza.',
        };
  });

  /** Campos del formulario de entrada (Req 7.1). */
  protected readonly departamento = signal('');
  protected readonly ciudad = signal('');
  protected readonly tipoInmueble = signal(this.tipoInmuebleDefecto);
  protected readonly canon = signal('');
  protected readonly administracion = signal('');
  protected readonly fechaInicioVigencia = signal(hoyIso());
  protected readonly mesesVigencia = signal(this.mesesDefecto);
  protected readonly aseguraIva = signal(false);

  /** Coberturas interactivas (toggle + monto) (Req 7.5, 7.6). */
  protected readonly coberturas = signal<CoberturaEstado[]>([]);

  /** Ciudades cubiertas del departamento seleccionado, resueltas por el backend (Req 7.2). */
  protected readonly ciudadesCobertura = signal<readonly string[]>([]);

  /** Verdadero mientras se consultan las ciudades del departamento (Req 7.2). */
  protected readonly cargandoCiudades = signal(false);

  /** Indica si el Broker ya intentó calcular (para revelar errores de campo). */
  protected readonly intentoCalculo = signal(false);

  /** Estado de cobertura del departamento seleccionado (Req 7.2, 7.3). */
  protected readonly cobertura = computed(() => estadoCobertura(this.ciudadesCobertura()));

  /** Verdadero cuando el departamento seleccionado no tiene ciudades en cobertura (Req 7.3). */
  /** El departamento seleccionado es uno de los bloqueados (Antioquia): se informa y no se permite calcular. */
  protected readonly departamentoNoHabilitado = computed(() => departamentoBloqueado(this.departamento()));

  protected readonly sinCobertura = computed(
    () => this.departamento().trim().length > 0 && !this.cargandoCiudades() && !this.cobertura().tieneCobertura,
  );

  /** Resultado de la validación pura del canon (Req 7.7, 7.8). */
  protected readonly validacionCanon = computed(() => validarCanon(this.canon()));

  /** Verdadero cuando el inmueble es Comercio y se puede asegurar el IVA (Req 7.4). */
  protected readonly esComercio = computed(() => this.tipoInmueble() === this.tipoComercio);

  /** Mensaje de error del campo canon cuando corresponde mostrarlo (Req 7.8). */
  protected readonly errorCanon = computed(() => {
    if (!this.intentoCalculo() || this.validacionCanon().valido) {
      return '';
    }
    switch (this.validacionCanon().motivo) {
      case 'vacio':
        return 'El canon es obligatorio';
      case 'no_numerico':
        return 'El canon debe ser un valor numérico';
      default:
        return 'El canon debe ser mayor a $0';
    }
  });

  /** Canon mínimo del cotizador (`COTIZACION_CANON_MINIMO`); 0 si no está configurado. */
  protected readonly canonMinimo = this.catalogo.parametro('COTIZACION_CANON_MINIMO') || 0;
  private readonly canonBajoMinimo = computed(
    () => this.validacionCanon().valido && (this.validacionCanon().valor ?? 0) < this.canonMinimo,
  );
  protected readonly errorCanonMinimo = computed(() =>
    this.intentoCalculo() && this.canonBajoMinimo()
      ? `El canon mínimo para cotizar es ${formatearCop(this.canonMinimo)}.`
      : '',
  );

  /** La administración no puede superar el canon (el servidor también lo rechaza). */
  private readonly administracionMayorQueCanon = computed(() => {
    const admin = validarCanon(this.tieneAdmin() === 'si' ? this.administracion() : '');
    return admin.valido && this.validacionCanon().valido && (admin.valor ?? 0) > (this.validacionCanon().valor ?? 0);
  });
  protected readonly errorAdministracion = computed(() =>
    this.intentoCalculo() && this.administracionMayorQueCanon() ? 'La administración no puede ser mayor que el canon.' : '',
  );

  /** Hoy (yyyy-mm-dd, hora de Colombia): la vigencia no puede iniciar en el pasado. */
  protected readonly hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

  /** Tarifa de IVA del canon comercial (`IVA_CANON_COMERCIO`) para el texto del interruptor; el valor lo calcula el backend. */
  protected readonly tarifaIvaCanon = Math.round((this.catalogo.parametro('IVA_CANON_COMERCIO') || 0) * 100);

  /**
   * Indica si el cálculo puede solicitarse (Req 7.3, 7.7, 7.8):
   * canon válido (> 0), cobertura de ciudad válida y demás campos obligatorios.
   */
  protected readonly puedeCalcular = computed(() => {
    if (!this.validacionCanon().valido || this.canonBajoMinimo() || this.departamentoNoHabilitado() || this.administracionMayorQueCanon()) {
      return false;
    }
    // El botón solo exige canon válido y campos básicos; no se bloquea por
    // cobertura de ciudad (fiel al prototipo, Req 7.7, 7.8). La cobertura solo
    // se informa; los departamentos ofrecidos ya tienen cobertura.
    return (
      this.departamento().trim().length > 0 &&
      this.ciudad().trim().length > 0 &&
      this.tipoInmueble().trim().length > 0 &&
      this.mesesVigenciaValidos()
    );
  });

  /** Carga el catálogo de coberturas para poblar los toggles (Req 14.1). */
  /** Resumen en vivo: valor destacado según haya cotización calculada o no. */
  protected readonly resumenPrincipal = computed(() => {
    const r = this.resultado();
    return {
      label: r ? 'Total de la cotización (con IVA)' : 'Total de la cotización',
      valor: r ? formatearCop(r.total) : '—',
    };
  });

  /** Filas del resumen: lo ingresado se refleja al instante; los totales llegan del cálculo. */
  /** Resumen: solo lo calculado por el backend; lo ingresado ya está visible en el formulario. */
  protected readonly resumenFilas = computed<FilaResumen[]>(() => {
    const r = this.resultado();
    if (!r) {
      return [];
    }
    const activas = this.coberturas().filter((c) => c.activa).length;
    return [
      { label: 'Prima neta', valor: formatearCop(r.primaNeta) },
      { label: 'IVA', valor: formatearCop(r.iva) },
      { label: 'Coberturas adicionales', valor: String(activas) },
    ];
  });

  /** Campos obligatorios sin completar (para guiar al usuario, no solo bloquear). */
  protected readonly faltantes = computed(() => {
    const falta: string[] = [];
    if (this.departamento().trim().length === 0) falta.push('departamento');
    if (this.ciudad().trim().length === 0) falta.push('ciudad');
    if (!this.validacionCanon().valido) falta.push('canon');
    if (this.fechaInicioVigencia().trim().length === 0) falta.push('fecha de inicio');
    return falta;
  });

  protected readonly notaAcciones = computed(() =>
    this.faltantes().length > 0 && this.intentoCalculo()
      ? `Para calcular completa: ${this.faltantes().join(', ')}.`
      : null,
  );

  protected readonly errorDepartamento = computed(() =>
    this.intentoCalculo() && this.departamento().trim().length === 0 ? 'Selecciona el departamento.' : '',
  );
  protected readonly errorCiudad = computed(() =>
    this.intentoCalculo() && this.departamento().trim().length > 0 && this.ciudad().trim().length === 0
      ? 'Selecciona una ciudad con cobertura.'
      : '',
  );
  protected readonly errorFecha = computed(() => {
    if (!this.intentoCalculo()) return '';
    const fecha = this.fechaInicioVigencia().trim();
    if (!fecha) return 'Indica cuándo inicia la vigencia.';
    return fecha < this.hoy ? 'La vigencia no puede iniciar en una fecha pasada.' : '';
  });

  /** ¿Hay datos que se perderían al limpiar? */
  protected readonly hayDatos = computed(
    () =>
      this.departamento().length > 0 ||
      this.canon().length > 0 ||
      this.resultado() !== null ||
      this.coberturas().some((c) => c.activa),
  );

  protected readonly confirmarLimpiar = signal(false);

  protected pedirLimpiar(): void {
    if (this.hayDatos()) {
      this.confirmarLimpiar.set(true);
    } else {
      this.limpiar();
    }
  }

  protected confirmarYLimpiar(): void {
    this.confirmarLimpiar.set(false);
    this.limpiar();
  }

  protected iconoCobertura(id: string): string {
    return ICONO_COBERTURA[id] ?? 'verified_user';
  }

  /** Alterna si el inmueble tiene cuota de administración; limpia el valor al desactivar. */
  protected onTieneAdmin(valor: string): void {
    this.tieneAdmin.set(valor === 'si' ? 'si' : 'no');
    if (valor !== 'si') {
      this.administracion.set('');
    }
  }

  protected verDetalle(id: string): void {
    this.detalleAbierto.set(id);
  }

  protected cerrarDetalle(): void {
    this.detalleAbierto.set(null);
  }

  protected irAClausulado(): void {
    this.cerrarDetalle();
    void this.router.navigate(['/app/documentos']);
  }

  protected puedeIncrementar(monto: number): boolean {
    return monto < this.montoMaximoCobertura;
  }

  /** Divide un texto en partes resaltando los importes ($500.000) como en el prototipo. */
  protected partesDescripcion(texto: string): { texto: string; negrita: boolean }[] {
    return texto
      .split(/(\$[\d.]+)/)
      .filter((p) => p.length > 0)
      .map((p) => ({ texto: p, negrita: /^\$[\d.]+$/.test(p) }));
  }

  protected onVigenciaSegmento(valor: string): void {
    this.onMesesChange(valor);
  }

  /** Monto de servicios públicos que se obsequia según el destino (vivienda $1.000.000, comercio $2.000.000). */
  protected readonly obsequioServicios = computed(() =>
    this.esComercio() ? OBSEQUIO_SERVICIOS_COMERCIO : OBSEQUIO_SERVICIOS_VIVIENDA);

  /** Monto mínimo de una cobertura: Servicios no baja del obsequio; las demás, de $0. */
  protected montoMinimo(id: string): number {
    return id === CODIGO_SERVICIOS ? this.obsequioServicios() : 0;
  }

  protected limpiar(): void {
    this.departamento.set('');
    this.ciudad.set('');
    this.ciudadesCobertura.set([]);
    this.tipoInmueble.set(this.tipoInmuebleDefecto);
    this.canon.set('');
    this.administracion.set('');
    this.tieneAdmin.set('no');
    this.fechaInicioVigencia.set(hoyIso());
    this.mesesVigencia.set(this.mesesDefecto);
    this.aseguraIva.set(false);
    this.intentoCalculo.set(false);
    this.resultado.set(null);
    this.coberturas.update((lista) => lista.map((c) => c.id === CODIGO_SERVICIOS
      ? { ...c, activa: true, montoAsegurado: this.obsequioServicios() }
      : { ...c, activa: false }));
  }

  ngOnInit(): void {
    this.coberturasService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalogo) => this.coberturas.set(this.mapearCoberturas(catalogo)),
        error: () => this.coberturas.set([]),
      });
  }

  /**
   * Reacciona al cambio de departamento: reinicia la ciudad y consulta las
   * ciudades cubiertas al API_Backend (Req 7.2). Si el departamento queda vacío,
   * limpia la cobertura.
   * @param departamento departamento seleccionado por el Broker.
   */
  protected onDepartamentoChange(departamento: string): void {
    this.departamento.set(departamento);
    this.ciudad.set('');
    const nombre = departamento.trim();
    if (nombre.length === 0) {
      this.ciudadesCobertura.set([]);
      return;
    }
    // Poblar de inmediato con el catálogo `ciudad`; el backend confirma la cobertura (Req 7.2).
    this.ciudadesCobertura.set(
      this.catalogo.opciones('ciudad').filter((c) => c['departamento'] === nombre).map((c) => c.descripcion),
    );
    this.cargandoCiudades.set(true);
    this.cotizadorService
      .ciudadesPorDepartamento(nombre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ciudades) => {
          if (ciudades.length > 0) {
            this.ciudadesCobertura.set(ciudades);
          }
          this.cargandoCiudades.set(false);
        },
        error: () => {
          // Se conserva lo ya poblado desde el catálogo; el Broker puede cotizar.
          this.cargandoCiudades.set(false);
        },
      });
  }

  /** Actualiza el tipo de inmueble; desactiva el IVA si deja de ser Comercio (Req 7.4). */
  protected onTipoInmuebleChange(tipo: string): void {
    const obsequioAnterior = this.obsequioServicios();
    this.tipoInmueble.set(tipo);
    // Servicios conserva lo adicional que eligió el Broker sobre el nuevo obsequio.
    const obsequio = this.obsequioServicios();
    this.ajustarMonto(CODIGO_SERVICIOS, (monto) => obsequio + Math.max(0, monto - obsequioAnterior));
    if (tipo !== this.tipoComercio) {
      this.aseguraIva.set(false);
    }
  }

  /** Actualiza los meses de vigencia acotados a [1, 36] (Req 7.1). */
  protected onMesesChange(valor: string | number): void {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      this.mesesVigencia.set(this.mesesMin);
      return;
    }
    const acotado = Math.min(this.mesesMax, Math.max(this.mesesMin, Math.trunc(numero)));
    this.mesesVigencia.set(acotado);
  }

  /** Activa/desactiva una cobertura; al activar se habilita su control de monto (Req 7.5). */
  protected alternarCobertura(id: string, activa: boolean): void {
    this.coberturas.update((lista) =>
      lista.map((cobertura) =>
        cobertura.id === id ? { ...cobertura, activa } : cobertura,
      ),
    );
  }

  /** Incrementa el monto de una cobertura en un paso de $500.000 (Req 7.6). */
  protected incrementar(id: string): void {
    this.ajustarMonto(id, (monto) => Math.min(this.montoMaximoCobertura, incrementarMonto(monto, this.pasoMonto)));
  }

  /** Decrementa el monto de una cobertura sin permitir negativos (mínimo $0) (Req 7.6). */
  protected decrementar(id: string): void {
    this.ajustarMonto(id, (monto) => Math.max(this.montoMinimo(id), decrementarMonto(monto, this.pasoMonto)));
  }

  /**
   * Solicita el cálculo autoritativo al Motor_Tarifas del API_Backend y muestra el
   * resultado inline (Req 7.7, 7.8, 8.7). Si la entrada es inválida, revela errores.
   */
  protected solicitarCalculo(): void {
    this.intentoCalculo.set(true);
    if (!this.puedeCalcular()) {
      queueMicrotask(() => this.enfocarPrimerError());
      return;
    }
    this.calculando.set(true);
    this.cotizadorService
      .calcular(this.construirRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.resultado.set(resultado);
          this.calculando.set(false);
        },
        error: () => {
          this.calculando.set(false);
          this.feedback.toast({ variante: 'error', mensaje: 'No pudimos calcular la cotización. Intenta de nuevo.' });
        },
      });
  }

  /**
   * Genera el PDF de la Cotizacion calculada (Req 9.1).
   * La generación real con jsPDF se completa cuando la dependencia esté fijada
   * desde JFrog; entre tanto se informa al Broker sin romper la experiencia.
   */
  protected onDescargarPdf(): void {
    const resultado = this.resultado();
    if (!resultado) {
      return;
    }
    if (!resultado.referencia) {
      return;
    }
    this.descargandoPdf.set(true);
    this.cotizadorService
      .descargarPdf(resultado.referencia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pdf) => {
          this.descargandoPdf.set(false);
          descargarArchivo(pdf, `cotizacion-${resultado.referencia}.pdf`);
        },
        error: () => {
          this.descargandoPdf.set(false);
          this.feedback.toast({ variante: 'error', mensaje: 'No se pudo descargar el PDF de la cotización. Intenta de nuevo.' });
        },
      });
  }

  /** Oculta el resultado y rehabilita la edición de los datos (Req 9.2). */
  protected onModificarDatos(): void {
    this.resultado.set(null);
  }

  /** Lleva la cotización a Contratación: siguiente paso del flujo de emisión (no se radica sin contrato). */
  protected onGenerarContrato(): void {
    const resultado = this.resultado();
    if (resultado?.referencia) {
      // La cotización viaja al contrato y luego a la radicación para precargar sus campos.
      const req = this.construirRequest();
      this.borrador.iniciarDesdeCotizacion({
        referencia: resultado.referencia,
        departamento: req.departamento,
        ciudad: req.ciudad,
        tipoInmueble: req.tipoInmueble,
        canon: req.canon,
        administracion: req.administracion,
        fechaInicioVigencia: req.fechaInicioVigencia,
        mesesVigencia: req.mesesVigencia,
        total: resultado.total,
      });
    }
    void this.router.navigate(['/app/contrato']);
  }

  /** trackBy de coberturas para render eficiente. */
  private enfocarPrimerError(): void {
    const campo = this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]');
    campo?.focus();
  }

  protected trackCobertura(_indice: number, cobertura: CoberturaEstado): string {
    return cobertura.id;
  }

  /** Verdadero si los meses de vigencia están dentro de [1, 36] (Req 7.1). */
  private mesesVigenciaValidos(): boolean {
    const meses = this.mesesVigencia();
    return Number.isInteger(meses) && meses >= this.mesesMin && meses <= this.mesesMax;
  }

  /** Aplica una transformación de monto a la cobertura indicada, normalizando el resultado (Req 7.6). */
  private ajustarMonto(id: string, transformar: (monto: number) => number): void {
    this.coberturas.update((lista) =>
      lista.map((cobertura) =>
        cobertura.id === id
          ? { ...cobertura, montoAsegurado: normalizarMonto(transformar(cobertura.montoAsegurado), this.pasoMonto) }
          : cobertura,
      ),
    );
  }

  /**
   * Mapea el catálogo del backend a coberturas adicionales interactivas (Req 7.6, 14.1). Solo se ofrecen
   * las marcadas `adicional` en `cat_cobertura` (amplían el valor asegurado y afectan el cálculo).
   * El backend trae `nombre` = código oficial, que es lo que espera `CoberturaSeleccion.id`.
   */
  private mapearCoberturas(catalogo: readonly CoberturaCatalogo[]): CoberturaEstado[] {
    const adicionales = new Set(
      this.catalogo.opciones('cobertura').filter((c) => c['adicional'] === true).map((c) => c.codigo),
    );
    return catalogo
      .filter((cobertura) => adicionales.has(cobertura.nombre))
      .map((cobertura) => ({
        id: cobertura.nombre,
        nombre: cobertura.descripcion,
        descripcion: cobertura.descripcion,
        // Servicios públicos viene incluido con el obsequio; lo adicional se cobra (5 % + IVA, backend).
        activa: cobertura.nombre === CODIGO_SERVICIOS,
        montoAsegurado: cobertura.nombre === CODIGO_SERVICIOS
          ? this.obsequioServicios()
          : normalizarMonto(cobertura.montoDefecto, this.pasoMonto),
      }));
  }

  /** Construye el `CotizacionRequest` a partir de los campos capturados (Req 7.1–7.6). */
  private construirRequest(): CotizacionRequest {
    const administracion = validarCanon(this.tieneAdmin() === 'si' ? this.administracion() : '');
    const coberturas: CoberturaSeleccion[] = this.coberturas().map((cobertura) => ({
      id: cobertura.id,
      activa: cobertura.activa,
      montoAsegurado: cobertura.activa ? cobertura.montoAsegurado : 0,
    }));
    return {
      departamento: this.departamento().trim(),
      ciudad: this.ciudad().trim(),
      tipoInmueble: this.tipoInmueble(),
      canon: this.validacionCanon().valor ?? 0,
      ...(administracion.valido ? { administracion: administracion.valor } : {}),
      fechaInicioVigencia: this.fechaInicioVigencia(),
      mesesVigencia: this.mesesVigencia(),
      coberturas,
      ...(this.esComercio() ? { aseguraIva: this.aseguraIva() } : {}),
    };
  }
}
