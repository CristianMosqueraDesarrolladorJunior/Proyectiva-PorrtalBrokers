import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Acción de un recurso descargable del prototipo: descargar PDF o abrir. */
type AccionRecurso = 'pdf' | 'abrir';

/** Recurso descargable de la Seccion_Documentos (Req 33.3, 33.4). */
interface RecursoDoc {
  readonly icono: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly accion: AccionRecurso;
  readonly url: string;
}

/** Sección de documentos agrupada por categoría (Req 33.3). */
interface SeccionDoc {
  readonly titulo: string;
  readonly recursos: readonly RecursoDoc[];
}

/**
 * Seccion_Documentos (Req 33.3, 33.4).
 *
 * Replica fielmente el prototipo: 5 secciones (`doc-section`) con `doc-list` de
 * `doc-item` (ícono + título + subtítulo + botón "↓ PDF" o "↗ Abrir"). Al
 * seleccionar un recurso, inicia su descarga/apertura (Req 33.4).
 */
@Component({
  selector: 'app-documentos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documentos.component.html',
  styleUrl: './documentos.component.scss',
})
export class DocumentosComponent {
  /** Secciones de documentos del prototipo (Req 33.3). */
  protected readonly secciones: readonly SeccionDoc[] = [
    {
      titulo: 'Formatos de renovación',
      recursos: [
        { icono: '♻️', titulo: 'Formato renovación · Persona natural', descripcion: 'Plantilla oficial', accion: 'pdf', url: '#' },
        { icono: '🏢', titulo: 'Formato renovación · Persona jurídica', descripcion: 'Plantilla oficial', accion: 'pdf', url: '#' },
      ],
    },
    {
      titulo: 'Cumplimiento y vinculación',
      recursos: [
        { icono: '🛡️', titulo: 'SARLAFT · Persona natural', descripcion: 'Obligatorio · KYC/AML', accion: 'pdf', url: '#' },
        { icono: '🛡️', titulo: 'SARLAFT · Persona jurídica', descripcion: 'Obligatorio', accion: 'pdf', url: '#' },
        { icono: '🔒', titulo: 'Formato de autorizaciones', descripcion: 'Habeas data y tratamiento de datos', accion: 'pdf', url: '#' },
        { icono: '📑', titulo: 'Acta de junta de socios', descripcion: 'Personas jurídicas', accion: 'pdf', url: '#' },
      ],
    },
    {
      titulo: 'Contratos y formatos del cliente',
      recursos: [
        { icono: '📝', titulo: 'Formato de contrato', descripcion: 'Plantilla editable', accion: 'pdf', url: '#' },
        { icono: '📋', titulo: 'Formato de inventario', descripcion: 'Estado del inmueble', accion: 'pdf', url: '#' },
      ],
    },
    {
      titulo: 'Condiciones y comisiones',
      recursos: [
        { icono: '📄', titulo: 'Clausulados', descripcion: 'Coberturas, exclusiones y condiciones', accion: 'pdf', url: '#' },
        { icono: '💲', titulo: 'Instructivo de comisiones', descripcion: 'Tarifas y porcentajes', accion: 'pdf', url: '#' },
      ],
    },
    {
      titulo: 'Instructivos y guías',
      recursos: [
        { icono: '📘', titulo: 'Instructivo de reclamación', descripcion: 'Paso a paso', accion: 'abrir', url: '#' },
        { icono: '📗', titulo: 'Instructivo de renovación', descripcion: 'Proceso completo', accion: 'abrir', url: '#' },
      ],
    },
  ];

  /** Etiqueta del botón según la acción del recurso (↓ PDF / ↗ Abrir). */
  protected etiquetaAccion(recurso: RecursoDoc): string {
    return recurso.accion === 'pdf' ? '↓ PDF' : '↗ Abrir';
  }

  /** Inicia la descarga o apertura del recurso en una pestaña nueva (Req 33.4). */
  protected abrir(recurso: RecursoDoc): void {
    window.open(recurso.url, '_blank', 'noopener,noreferrer');
  }

  /** trackBy de secciones. */
  protected trackSeccion(_i: number, seccion: SeccionDoc): string {
    return seccion.titulo;
  }

  /** trackBy de recursos. */
  protected trackRecurso(_i: number, recurso: RecursoDoc): string {
    return recurso.titulo;
  }
}
