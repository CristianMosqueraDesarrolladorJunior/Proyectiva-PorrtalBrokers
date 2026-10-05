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
  StickyActionsComponent,
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
import { PdfService } from '../../../core/services/pdf.service';
import type {
  CoberturaSeleccion,
  CotizacionRequest,
  CotizacionResult,
} from '../../../core/models/cotizacion.model';
import { validarCanon } from '../canon-validacion';
import {
  estadoCobertura,
  MENSAJE_CIUDAD_SIN_COBERTURA,
} from '../cobertura-ciudades';
import {
  decrementarMonto,
  incrementarMonto,
  normalizarMonto,
} from '../../../shared/util/monto-escalonado';
import {
  CIUDADES_POR_DEPARTAMENTO,
  COMISION_ESTIMADA,
  DETALLE_COBERTURAS,
  MONTO_MAXIMO_COBERTURA,
  NOTA_TASAS,
  DEPARTAMENTOS,
  IVA_CANON_COMERCIO,
  MESES_VIGENCIA_DEFECTO,
  MESES_VIGENCIA_MAX,
  MESES_VIGENCIA_MIN,
  TIPOS_INMUEBLE,
  TIPO_INMUEBLE_COMERCIO,
} from '../cotizador-catalogo';

const TIPO_INMUEBLE_DEFECTO = 'Vivienda';

/** Fecha de hoy (YYYY-MM-DD, hora local) como inicio de vigencia por defecto. */
function hoyIso(): string {
  const d = new Date();
  const dos = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Iconografía Material Symbols por tipo de inmueble y por cobertura (solo presentación). */
const ICONO_TIPO_INMUEBLE: Readonly<Record<string, string>> = {
  Vivienda: 'home',
  Comercio: 'storefront',
  Oficina: 'apartment',
  Bodega: 'warehouse',
  Local: 'store',
};

const ICONO_COBERTURA: Readonly<Record<string, string>> = {
  danios: 'handyman',
  servicios: 'bolt',
};

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
 * - Cuando el tipo es "Comercio", permite asegurar el IVA (19% del canon) (Req 7.4).
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
    StickyActionsComponent,
    SkeletonComponent,
    ModalDialogComponent,
  ],
  templateUrl: './cotizador-datos.component.html',
  styleUrl: './cotizador-datos.component.scss',
})
export class CotizadorDatosComponent implements OnInit {
  private readonly coberturasService = inject(CoberturasService);
  private readonly cotizadorService = inject(CotizadorService);
  private readonly pdfService = inject(PdfService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Resultado de la Cotizacion recibido del backend; `null` mientras no exista (Req 8.1, 9.4). */
  protected readonly resultado = signal<CotizacionResult | null>(null);

  /** Verdadero mientras se solicita el cálculo al backend (Req 8.7). */
  protected readonly calculando = signal(false);

  /** Verdadero mientras se genera el PDF (Req 9.1). */
  protected readonly descargandoPdf = signal(false);

  /** Mensaje de error genérico del cálculo. */
  protected readonly errorCalculo = signal('');

  /** Opciones de presentación de los selectores (Req 7.1, 7.4). */
  protected readonly departamentos = DEPARTAMENTOS;
  protected readonly tiposInmueble = TIPOS_INMUEBLE;
  protected readonly mesesMin = MESES_VIGENCIA_MIN;
  protected readonly mesesMax = MESES_VIGENCIA_MAX;
  protected readonly mensajeSinCobertura = MENSAJE_CIUDAD_SIN_COBERTURA;

  /** Opciones del selector segmentado de tipo de inmueble (catálogo real). */
  protected readonly opcionesTipo: readonly OpcionSegmentada[] = TIPOS_INMUEBLE.map((tipo) => ({
    valor: tipo,
    etiqueta: tipo,
    icono: ICONO_TIPO_INMUEBLE[tipo] ?? 'home_work',
  }));

  /** Vigencias frecuentes (el campo numérico permite cualquier valor 1–36). */
  protected readonly opcionesVigencia: readonly OpcionSegmentada[] = [6, 12, 24, 36].map((m) => ({
    valor: String(m),
    etiqueta: `${m} meses`,
  }));

  protected readonly atajosMonto: readonly number[] = [100_000, 500_000, 1_000_000];

  /** Avance del flujo completo (el cotizador es el paso 1; el resto ocurre en Radicación). */
  protected readonly pasosFlujo: readonly string[] = ['Inmueble', 'Propietario', 'Documentos', 'Confirmación'];

  protected readonly opcionesSiNo: readonly OpcionSegmentada[] = [
    { valor: 'no', etiqueta: 'No' },
    { valor: 'si', etiqueta: 'Sí' },
  ];

  /** ¿Tiene cuota de administración? Habilita el valor de administración. */
  protected readonly tieneAdmin = signal<'si' | 'no'>('no');

  /** Cobertura cuyo detalle se muestra en el modal (null = cerrado). */
  protected readonly detalleAbierto = signal<string | null>(null);

  protected readonly detalleActual = computed(() => {
    const id = this.detalleAbierto();
    const cobertura = this.coberturas().find((c) => c.id === id);
    return cobertura && id ? { nombre: cobertura.nombre, ...DETALLE_COBERTURAS[id] } : null;
  });

  protected readonly notaTasas = NOTA_TASAS;
  protected readonly cop = formatearCop;

  /** Comisión estimada: la informada por el backend o, si no, 8% de la prima neta del seguro principal. */
  protected readonly comisionEstimada = computed(() => {
    const r = this.resultado();
    if (!r) {
      return null;
    }
    if (r.comision !== undefined) {
      return r.comision;
    }
    const principal = r.conceptos[0];
    return principal ? Math.round(principal.primaNeta * COMISION_ESTIMADA) : null;
  });

  protected readonly resumenDestacado = computed(() => {
    const comision = this.comisionEstimada();
    return comision === null
      ? null
      : {
          label: 'Tu comisión estimada',
          valor: formatearCop(comision),
          nota: 'Calculada sobre la prima neta del seguro principal.',
        };
  });

  /** Campos del formulario de entrada (Req 7.1). */
  protected readonly departamento = signal('');
  protected readonly ciudad = signal('');
  protected readonly tipoInmueble = signal(TIPO_INMUEBLE_DEFECTO);
  protected readonly canon = signal('');
  protected readonly administracion = signal('');
  protected readonly fechaInicioVigencia = signal(hoyIso());
  protected readonly mesesVigencia = signal(MESES_VIGENCIA_DEFECTO);
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
  protected readonly sinCobertura = computed(
    () => this.departamento().trim().length > 0 && !this.cargandoCiudades() && !this.cobertura().tieneCobertura,
  );

  /** Resultado de la validación pura del canon (Req 7.7, 7.8). */
  protected readonly validacionCanon = computed(() => validarCanon(this.canon()));

  /** Verdadero cuando el inmueble es Comercio y se puede asegurar el IVA (Req 7.4). */
  protected readonly esComercio = computed(() => this.tipoInmueble() === TIPO_INMUEBLE_COMERCIO);

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

  /** IVA asegurado estimado (19% del canon) mostrado como referencia (Req 7.4). */
  protected readonly ivaCanonEstimado = computed(() => {
    const canon = this.validacionCanon().valor ?? 0;
    return Math.round(canon * IVA_CANON_COMERCIO);
  });

  /**
   * Indica si el cálculo puede solicitarse (Req 7.3, 7.7, 7.8):
   * canon válido (> 0), cobertura de ciudad válida y demás campos obligatorios.
   */
  protected readonly puedeCalcular = computed(() => {
    if (!this.validacionCanon().valido) {
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
      { label: 'Prima neta', valor: formatearCop(r.primaNetaTotal) },
      { label: 'IVA', valor: formatearCop(r.ivaTotal) },
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
  protected readonly errorFecha = computed(() =>
    this.intentoCalculo() && this.fechaInicioVigencia().trim().length === 0
      ? 'Indica cuándo inicia la vigencia.'
      : '',
  );

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
    return monto < MONTO_MAXIMO_COBERTURA;
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

  protected limpiar(): void {
    this.departamento.set('');
    this.ciudad.set('');
    this.ciudadesCobertura.set([]);
    this.tipoInmueble.set(TIPO_INMUEBLE_DEFECTO);
    this.canon.set('');
    this.administracion.set('');
    this.tieneAdmin.set('no');
    this.fechaInicioVigencia.set(hoyIso());
    this.mesesVigencia.set(MESES_VIGENCIA_DEFECTO);
    this.aseguraIva.set(false);
    this.intentoCalculo.set(false);
    this.errorCalculo.set('');
    this.resultado.set(null);
    this.coberturas.update((lista) => lista.map((c) => ({ ...c, activa: false })));
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
    // Poblar de inmediato con el catálogo local para que el selector nunca quede
    // vacío; el backend confirma/actualiza la cobertura (fuente autoritativa, Req 7.2).
    this.ciudadesCobertura.set(CIUDADES_POR_DEPARTAMENTO[nombre] ?? []);
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
          // Se conserva el catálogo local ya poblado; el Broker puede cotizar.
          this.cargandoCiudades.set(false);
        },
      });
  }

  /** Actualiza el tipo de inmueble; desactiva el IVA si deja de ser Comercio (Req 7.4). */
  protected onTipoInmuebleChange(tipo: string): void {
    this.tipoInmueble.set(tipo);
    if (tipo !== TIPO_INMUEBLE_COMERCIO) {
      this.aseguraIva.set(false);
    }
  }

  /** Actualiza los meses de vigencia acotados a [1, 36] (Req 7.1). */
  protected onMesesChange(valor: string | number): void {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      this.mesesVigencia.set(MESES_VIGENCIA_MIN);
      return;
    }
    const acotado = Math.min(MESES_VIGENCIA_MAX, Math.max(MESES_VIGENCIA_MIN, Math.trunc(numero)));
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
    this.ajustarMonto(id, (monto) => Math.min(MONTO_MAXIMO_COBERTURA, incrementarMonto(monto)));
  }

  /** Decrementa el monto de una cobertura sin permitir negativos (mínimo $0) (Req 7.6). */
  protected decrementar(id: string): void {
    this.ajustarMonto(id, decrementarMonto);
  }

  /**
   * Solicita el cálculo autoritativo al Motor_Tarifas del API_Backend y muestra el
   * resultado inline (Req 7.7, 7.8, 8.7). Si la entrada es inválida, revela errores.
   */
  protected solicitarCalculo(): void {
    this.intentoCalculo.set(true);
    this.errorCalculo.set('');
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
          this.errorCalculo.set('No fue posible calcular la cotización. Intenta nuevamente.');
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
    this.descargandoPdf.set(true);
    try {
      const blob = this.pdfService.generarPdfCotizacion({
        request: this.construirRequest(),
        resultado,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      URL.revokeObjectURL(url);
    } catch {
      this.errorCalculo.set(
        'La descarga en PDF estará disponible próximamente.',
      );
    } finally {
      this.descargandoPdf.set(false);
    }
  }

  /** Oculta el resultado y rehabilita la edición de los datos (Req 9.2). */
  protected onModificarDatos(): void {
    this.resultado.set(null);
    this.errorCalculo.set('');
  }

  /** Navega a la sección Radicación conservando el contexto (Req 9.3). */
  protected onRadicarPoliza(): void {
    void this.router.navigate(['/app/radicacion']);
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
    return Number.isInteger(meses) && meses >= MESES_VIGENCIA_MIN && meses <= MESES_VIGENCIA_MAX;
  }

  /** Aplica una transformación de monto a la cobertura indicada, normalizando el resultado (Req 7.6). */
  private ajustarMonto(id: string, transformar: (monto: number) => number): void {
    this.coberturas.update((lista) =>
      lista.map((cobertura) =>
        cobertura.id === id
          ? { ...cobertura, montoAsegurado: normalizarMonto(transformar(cobertura.montoAsegurado)) }
          : cobertura,
      ),
    );
  }

  /** Mapea el catálogo del backend a coberturas interactivas con monto normalizado (Req 7.6, 14.1). */
  private mapearCoberturas(catalogo: readonly CoberturaCatalogo[]): CoberturaEstado[] {
    return catalogo.map((cobertura) => ({
      id: cobertura.id,
      nombre: cobertura.nombre,
      descripcion: cobertura.descripcion,
      activa: false,
      montoAsegurado: normalizarMonto(cobertura.montoDefecto),
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
