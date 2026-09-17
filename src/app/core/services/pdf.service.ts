import { Injectable } from '@angular/core';

import { CotizacionRequest, CotizacionResult } from '../models/cotizacion.model';

/**
 * Datos necesarios para generar el PDF de una Cotizacion (Req 9.1).
 */
export interface DatosPdfCotizacion {
  readonly request: CotizacionRequest;
  readonly resultado: CotizacionResult;
}

/**
 * Servicio de generación de PDF de la Cotizacion (Req 9.1).
 *
 * La generación se implementará con `jsPDF` (más `jspdf-autotable` para el desglose),
 * la librería aprobada para PDF en el catálogo institucional. Actualmente `jsPDF` NO
 * está instalado en el proyecto: no se agregan dependencias en esta tarea (tarea 3.6).
 * Esta clase deja la firma tipada estable que consumirá el Cotizador (tarea 9.5) y la
 * implementación real se completará cuando `jsPDF` se fije desde JFrog con versión exacta.
 *
 * @remarks
 * Se genera únicamente cuando existe una Cotizacion válida (Req 9.1, 9.4); el botón
 * "Descargar PDF" permanece deshabilitado sin resultado.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  /**
   * Genera y descarga el PDF de la Cotizacion (Req 9.1).
   * @param datos datos de entrada y resultado de la Cotizacion a plasmar en el PDF.
   * @returns el `Blob` del PDF generado.
   * @throws {Error} mientras `jsPDF` no esté instalado desde JFrog (versión fija).
   */
  generarPdfCotizacion(datos: DatosPdfCotizacion): Blob {
    // TODO(tarea 9.5): implementar con jsPDF + jspdf-autotable una vez fijada la
    // dependencia desde JFrog (sin `^`, `~`, `*`, `latest`). No agregar dependencias
    // en la tarea 3.6. `datos` (request + resultado) alimentará el documento.
    void datos;
    throw new Error(
      'Generación de PDF no disponible: jsPDF aún no está instalado (pendiente tarea 9.5).',
    );
  }
}
