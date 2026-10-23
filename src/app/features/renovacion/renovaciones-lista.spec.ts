import type { AccionRenovacion } from '../../core/models/poliza.model';
import { accionDe, accionRenovacion, ordenarPorUrgencia, prioridadRenovacion } from './renovaciones-lista';

const p = (estado: string, fechaVencimiento: string, gestion: string | null = null, accion?: AccionRenovacion) => ({
  estado,
  fechaVencimiento,
  gestion,
  accion,
});

describe('renovaciones-lista', () => {
  it('Given pólizas con su acción, When se ordenan, Then primero lo que hay que hacer y al final lo cerrado', () => {
    const orden = ordenarPorUrgencia([
      p('RENOVADA', '2026-01-01', 'Renovada', 'CERRADA'),
      p('A_PUNTO_DE_VENCER', '2026-11-05', 'En expedición', 'EN_PROCESO'),
      p('VENCIDA', '2026-04-03', null, 'INDUCCION'),
      p('A_PUNTO_DE_VENCER', '2026-11-05', null, 'RENOVAR'),
      p('A_PUNTO_DE_VENCER', '2026-10-25', null, 'RENOVAR'),
      p('A_PUNTO_DE_VENCER', '2026-10-28', 'Corrección pendiente', 'CORREGIR'),
    ]).map((x) => x.accion + ':' + x.fechaVencimiento);
    expect(orden).toEqual([
      'RENOVAR:2026-10-25',
      'RENOVAR:2026-11-05',
      'CORREGIR:2026-10-28',
      'INDUCCION:2026-04-03',
      'EN_PROCESO:2026-11-05',
      'CERRADA:2026-01-01',
    ]);
  });

  it('Given la lista original, When se ordena, Then no la modifica', () => {
    const original = [p('RENOVADA', '2027-01-01', null, 'CERRADA'), p('A_PUNTO_DE_VENCER', '2026-10-25', null, 'RENOVAR')];
    ordenarPorUrgencia(original);
    expect(original[0].estado).toBe('RENOVADA');
  });

  it('Given la acción del backend, When se pide el botón, Then solo lo pendiente se gestiona', () => {
    expect(accionRenovacion(p('A_PUNTO_DE_VENCER', '2026-11-01', null, 'RENOVAR'))).toBe('Renovar');
    expect(accionRenovacion(p('VENCIDA', '2026-01-01', null, 'INDUCCION'))).toBe('Inducción');
    expect(accionRenovacion(p('A_PUNTO_DE_VENCER', '2026-11-01', 'Corrección pendiente', 'CORREGIR'))).toBe('Corregir');
    // Renovada, desistida o en expedición: solo se consulta, aunque la fecha diga otra cosa.
    expect(accionRenovacion(p('A_PUNTO_DE_VENCER', '2026-11-01', 'Renovada', 'CERRADA'))).toBe('Ver detalle');
    expect(accionRenovacion(p('VENCIDA', '2026-01-01', 'En expedición', 'EN_PROCESO'))).toBe('Ver detalle');
  });

  it('Given una respuesta sin acción, When se deduce, Then cerrada, inducción, corrección o renovar', () => {
    expect(accionDe(p('RENOVADA', '2026-01-01'))).toBe('CERRADA');
    expect(accionDe(p('VENCIDA', '2026-01-01'))).toBe('INDUCCION');
    expect(accionDe(p('A_PUNTO_DE_VENCER', '2026-11-01', 'Corrección pendiente'))).toBe('CORREGIR');
    expect(accionDe(p('PROXIMA_A_RENOVAR', '2026-12-01'))).toBe('RENOVAR');
    expect(prioridadRenovacion(p('OTRO', '2026-12-01', null, 'CERRADA'))).toBe(4);
  });
});
