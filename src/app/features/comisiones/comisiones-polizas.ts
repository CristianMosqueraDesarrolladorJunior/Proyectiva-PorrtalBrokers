import type { EstadoCobro, PolizaExpedida } from '../../core/models/comisiones.model';
import { pesos } from '../../core/util/numeros-letras';
import type { FilaTabla } from '../../shared/components/data-table/data-table.component';

/** Estados de cobro de una póliza: etiqueta para el broker y variante de la insignia. */
export const ESTADOS_COBRO: readonly { readonly valor: EstadoCobro; readonly etiqueta: string; readonly variante: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente por cobrar', variante: 'warning' },
  { valor: 'EN_COBRO', etiqueta: 'En cuenta de cobro', variante: 'info' },
  { valor: 'ORDEN_PAGO', etiqueta: 'En gestión de pago', variante: 'info' },
  { valor: 'PAGADA', etiqueta: 'Pagada', variante: 'success' },
  { valor: 'FUERA_PLAZO', etiqueta: 'Fuera de plazo', variante: 'danger' },
  { valor: 'SIN_RECAUDO', etiqueta: 'Aún sin recaudo', variante: 'info' },
];

export function etiquetaEstado(estado: EstadoCobro): string {
  return ESTADOS_COBRO.find((e) => e.valor === estado)?.etiqueta ?? estado;
}

/** `2026-08-20` → `20/08/2026`; `—` si no hay fecha. */
export function fechaCorta(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** Solo las pendientes por cobrar se pueden incluir en una cuenta de cobro. */
export function esCobrable(p: PolizaExpedida): boolean {
  return p.estadoPago === 'PENDIENTE';
}

/** Filtros de la tabla: estado y rango de fecha de emisión (ISO `AAAA-MM-DD`, ambos extremos incluidos). */
export interface FiltrosPolizas {
  readonly estado: EstadoCobro | '';
  readonly desde: string;
  readonly hasta: string;
}

export function filtrarPolizas(polizas: readonly PolizaExpedida[], f: FiltrosPolizas): readonly PolizaExpedida[] {
  return polizas.filter((p) => {
    if (f.estado && p.estadoPago !== f.estado) return false;
    if (f.desde && (!p.fechaEmision || p.fechaEmision < f.desde)) return false;
    if (f.hasta && (!p.fechaEmision || p.fechaEmision > f.hasta)) return false;
    return true;
  });
}

/** Fila del `app-data-table`: valores para mostrar y `…Orden` para ordenar por el valor real. */
export function filaPoliza(p: PolizaExpedida): FilaTabla {
  const variante = ESTADOS_COBRO.find((e) => e.valor === p.estadoPago)?.variante ?? 'info';
  return {
    id: p.numeroPoliza,
    poliza: p.numeroPoliza,
    emision: fechaCorta(p.fechaEmision),
    emisionOrden: p.fechaEmision ?? '',
    estado: etiquetaEstado(p.estadoPago),
    estadoVariante: variante,
    valor: p.valorPoliza > 0 ? pesos(p.valorPoliza) : '—',
    valorOrden: p.valorPoliza,
    comision: p.comision > 0 ? pesos(p.comision) : '—',
    comisionOrden: p.comision,
    ver: '',
    // Fuera de plazo se cobra en una cuenta aparte; «En cuenta de cobro» se puede volver a cobrar (con aviso).
    seleccionable: esCobrable(p) || p.estadoPago === 'FUERA_PLAZO' || p.estadoPago === 'EN_COBRO' ? 1 : 0,
  };
}
