import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { AlertBannerComponent, BotonComponent } from '../../../../shared/components';
import {
  ConceptoCotizacion,
  CotizacionResult,
} from '../../../../core/models/cotizacion.model';

/**
 * Descripción de una columna del desglose de la Cotizacion (Req 8.1).
 * `key` identifica el campo del `ConceptoCotizacion`; `header` es la etiqueta visible.
 */
export interface ColumnaDesglose {
  readonly key: keyof ConceptoCotizacion;
  readonly header: string;
}

/**
 * CotizadorResultadoComponent — resultado de la Cotizacion y acciones (Req 8, 9).
 *
 * Muestra el desglose calculado por el Motor_Tarifas del API_Backend (columnas
 * CONCEPTO, VALOR ASEGURADO, MESES, BASE CÁLCULO PERIODO, TASA, PRIMA NETA,
 * IVA (19%) y TOTAL) — el cálculo es autoritativo del backend y el front solo
 * presenta el `CotizacionResult` recibido (Req 8.1, 8.7). Al mostrarse el
 * resultado, despliega la alerta al propietario "sin contrato firmado no hay
 * seguro" mediante `AlertBannerComponent` variante warning (Req 8.6).
 *
 * Acciones (Req 9):
 * - "Descargar PDF": emite `descargarPdf`; permanece DESHABILITADO mientras no
 *   exista una Cotizacion calculada (`resultado === null`) (Req 9.1, 9.4).
 * - "Modificar datos": emite `modificarDatos` para que el contenedor oculte el
 *   resultado y rehabilite la edición de los datos de entrada (Req 9.2).
 * - "Radicar póliza": emite `radicarPoliza` para que el contenedor navegue a la
 *   sección Radicación conservando el contexto de la Cotizacion (Req 9.3).
 *
 * Standalone + `inject()`-friendly, estilos solo vía Design_Token, tabla
 * accesible con `scope` de encabezados y foco visible en las acciones.
 */
@Component({
  selector: 'app-cotizador-resultado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent],
  templateUrl: './cotizador-resultado.component.html',
  styleUrl: './cotizador-resultado.component.scss',
})
export class CotizadorResultadoComponent {
  /**
   * Resultado autoritativo de la Cotizacion recibido del API_Backend (Req 8.1).
   * `null` significa que aún no existe una Cotizacion calculada: la tabla no se
   * muestra y la descarga de PDF queda deshabilitada (Req 9.4).
   */
  @Input() resultado: CotizacionResult | null = null;

  /**
   * Indica que la generación del PDF está en curso; deshabilita el botón para
   * evitar solicitudes duplicadas (Req 9.1).
   */
  @Input() descargandoPdf = false;

  /** Emite la intención de descargar el PDF de la Cotizacion calculada (Req 9.1). */
  @Output() descargarPdf = new EventEmitter<void>();

  /** Emite la intención de modificar los datos de entrada (Req 9.2). */
  @Output() modificarDatos = new EventEmitter<void>();

  /** Emite la intención de radicar la póliza a partir del resultado (Req 9.3). */
  @Output() radicarPoliza = new EventEmitter<void>();

  /** Columnas del desglose en el orden exacto del prototipo (Req 8.1). */
  protected readonly columnas: readonly ColumnaDesglose[] = [
    { key: 'concepto', header: 'CONCEPTO' },
    { key: 'valorAsegurado', header: 'VALOR ASEGURADO' },
    { key: 'meses', header: 'MESES' },
    { key: 'baseCalculoPeriodo', header: 'BASE CÁLCULO PERIODO' },
    { key: 'tasa', header: 'TASA' },
    { key: 'primaNeta', header: 'PRIMA NETA' },
    { key: 'iva', header: 'IVA (19%)' },
    { key: 'total', header: 'TOTAL' },
  ];

  /** Indica si existe una Cotizacion calculada para mostrar (Req 8.1, 9.4). */
  protected get hayResultado(): boolean {
    return this.resultado !== null;
  }

  /**
   * La descarga en PDF solo está habilitada cuando existe una Cotizacion
   * calculada y no hay una descarga en curso (Req 9.1, 9.4).
   */
  protected get pdfDeshabilitado(): boolean {
    return !this.hayResultado || this.descargandoPdf;
  }

  /** Emite la descarga de PDF si existe una Cotizacion calculada (Req 9.1, 9.4). */
  protected onDescargarPdf(): void {
    if (this.pdfDeshabilitado) {
      return;
    }
    this.descargarPdf.emit();
  }

  /** Emite la intención de modificar los datos de entrada (Req 9.2). */
  protected onModificarDatos(): void {
    this.modificarDatos.emit();
  }

  /** Emite la intención de radicar la póliza (Req 9.3). */
  protected onRadicarPoliza(): void {
    this.radicarPoliza.emit();
  }

  /**
   * Devuelve el valor formateado de una celda del desglose para presentación.
   * Los importes monetarios y la tasa se formatean en configuración regional
   * colombiana; el resto se muestra tal cual.
   * @param concepto fila del desglose recibida del backend.
   * @param columna columna a formatear.
   */
  protected valorCelda(
    concepto: ConceptoCotizacion,
    columna: ColumnaDesglose,
  ): string {
    const valor = concepto[columna.key];
    if (columna.key === 'concepto') {
      return String(valor);
    }
    if (columna.key === 'meses') {
      return String(valor);
    }
    if (columna.key === 'tasa') {
      return this.formatearTasa(Number(valor));
    }
    return this.formatearMoneda(Number(valor));
  }

  /** Formatea un importe como pesos colombianos sin decimales. */
  protected formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  /** Formatea la tasa (p. ej. 3.5) como porcentaje "3.5%". */
  protected formatearTasa(valor: number): string {
    return `${valor}%`;
  }

  /** trackBy de columnas para render eficiente. */
  protected trackColumna(_indice: number, columna: ColumnaDesglose): string {
    return String(columna.key);
  }

  /** trackBy de conceptos por índice de fila. */
  protected trackConcepto(indice: number): number {
    return indice;
  }
}
