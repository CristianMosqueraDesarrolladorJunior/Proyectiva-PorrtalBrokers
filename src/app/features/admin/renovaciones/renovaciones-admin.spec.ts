import { celdasFechas, fechaHora } from '../../../core/services/admin.helpers';
import { pasosHistorial } from './renovaciones-admin.component';

describe('historial de renovaciones del Warehouse', () => {
  it('convierte "actor:estado -> actor:estado" en pasos sin repeticiones consecutivas', () => {
    const pasos = pasosHistorial(
      'yazmin.mora:Enviar a Expedicion -> Sistema (UpdateRenovations - Col Z):Expedido -> Sistema (UpdateRenovations - Col Z):Expedido',
    );
    expect(pasos.map((p) => [p.descripcion, p.tipo])).toEqual([
      ['yazmin.mora', 'Enviar a Expedicion'],
      ['Sistema (UpdateRenovations - Col Z)', 'Expedido'],
    ]);
    expect(pasosHistorial(null)).toEqual([]);
  });
});

describe('matriz de fechas de la consola', () => {
  it('formatea creado y último movimiento y conserva el valor real para ordenar', () => {
    const c = celdasFechas('2026-10-01T10:00:00-05:00', null);
    expect(c.creadoOrden).toBe('2026-10-01T10:00:00-05:00');
    // Sin movimiento posterior, el último movimiento es la creación.
    expect(c.ultimoMovimientoOrden).toBe(c.creadoOrden);
    expect(c.creado).toContain('oct 2026');
    expect(fechaHora(null)).toBe('—');
    expect(fechaHora('no-es-fecha')).toBe('—');
  });
});
