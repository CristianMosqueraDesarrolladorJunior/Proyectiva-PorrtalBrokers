import { VarianteBadge } from '../../shared/components';

/** Variante del badge para los estados documentales del Warehouse. */
export function varianteEstado(estado: string): VarianteBadge {
  switch (estado) {
    case 'Expedido':
      return 'success';
    case 'Pendiente Corrección Documental':
      return 'warning';
    case 'Desistido':
      return 'danger';
    default:
      return 'info';
  }
}

/** Etiqueta corta del estado para tablas. */
export function estadoCorto(estado: string): string {
  switch (estado) {
    case 'Pendiente Corrección Documental':
      return 'Pend. corrección';
    case 'Pendiente Validación Documental':
      return 'Pend. validación';
    default:
      return estado;
  }
}
