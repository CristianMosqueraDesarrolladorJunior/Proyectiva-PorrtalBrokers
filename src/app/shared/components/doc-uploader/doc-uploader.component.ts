import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/**
 * Regla de presentación de un documento a cargar en el uploader (Req 35.7).
 *
 * Es un contrato de UI genérico: identifica el documento, su etiqueta, texto de
 * ayuda, ícono y si es obligatorio. La validación autoritativa de MIME, tamaño y
 * vigencia es lógica pura separada (tarea 4.5) y se revalida en el API_Backend.
 */
export interface ReglaDocumentoUploader {
  readonly id: string;
  readonly etiqueta: string;
  readonly descripcion: string;
  readonly icono?: string;
  readonly obligatorio?: boolean;
}

/** Evento emitido al seleccionar un archivo para un documento (Req 35.7). */
export interface ArchivoSeleccionado {
  readonly id: string;
  readonly archivo: File;
}

/** Extensiones y tipos MIME aceptados por el uploader (.pdf/.jpg/.jpeg/.png). */
const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

/**
 * DocUploaderComponent — Componente_Compartido de cargador de documentos
 * (Req 35.7, 24.3).
 *
 * Integra `doc-list`, `doc-item`, `doc-icon`, `doc-info` y el botón de carga del
 * prototipo, totalmente tokenizado. Recibe la lista de reglas de documento por
 * `@Input()` y emite el archivo seleccionado por `@Output()`. Acepta únicamente
 * archivos .pdf/.jpg/.jpeg/.png en el selector nativo (la validación completa es
 * responsabilidad de la lógica de validación y del API_Backend).
 *
 * Accesibilidad: cada regla se asocia a un `<input type="file">` etiquetado,
 * operable por teclado con foco visible (Req 27.1, 27.3, 27.5).
 */
@Component({
  selector: 'app-doc-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './doc-uploader.component.html',
  styleUrl: './doc-uploader.component.scss',
})
export class DocUploaderComponent {
  /** Reglas de los documentos a mostrar en la lista de carga. */
  @Input({ required: true }) reglas: readonly ReglaDocumentoUploader[] = [];

  /** Nombres de los archivos ya cargados, indexados por id de documento. */
  @Input() cargados: Readonly<Record<string, string>> = {};

  /** Estado deshabilitado global del uploader. */
  @Input() disabled = false;

  /** Emite el archivo seleccionado junto con el id del documento. */
  @Output() archivoSeleccionado = new EventEmitter<ArchivoSeleccionado>();

  /** Valor del atributo `accept` del input de archivo. */
  protected readonly accept = ACCEPT_ATTR;

  /** Procesa la selección de archivo del input nativo y emite el evento. */
  protected onArchivo(evento: Event, id: string): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }
    this.archivoSeleccionado.emit({ id, archivo });
    // Permite volver a seleccionar el mismo archivo tras un rechazo de validación.
    input.value = '';
  }

  /** Indica si un documento ya tiene un archivo cargado. */
  protected estaCargado(id: string): boolean {
    return !!this.cargados[id];
  }

  /** Nombre del archivo cargado para un documento, si existe. */
  protected nombreCargado(id: string): string {
    return this.cargados[id] ?? '';
  }

  /** trackBy de reglas para render eficiente. */
  protected trackRegla(_indice: number, regla: ReglaDocumentoUploader): string {
    return regla.id;
  }
}
