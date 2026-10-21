import { accionRenovacion, ordenarPorUrgencia, prioridadRenovacion } from './renovaciones-lista';

const p = (estado: string, fechaVencimiento: string, gestion: string | null = null) => ({ estado, fechaVencimiento, gestion });

describe('renovaciones-lista', () => {
  it('Given pólizas de todos los estados, When se ordenan, Then primero lo urgente y al final lo cerrado', () => {
    const orden = ordenarPorUrgencia([
      p('RENOVADA', '2026-01-01'),
      p('VIGENTE', '2027-05-01'),
      p('VENCIDA', '2026-04-03'),
      p('PROXIMA_A_RENOVAR', '2026-12-01'),
      p('A_PUNTO_DE_VENCER', '2026-11-05'),
      p('A_PUNTO_DE_VENCER', '2026-10-25'),
      p('NO_RENOVADA', '2026-02-01'),
    ]).map((x) => x.estado + ':' + x.fechaVencimiento);
    expect(orden).toEqual([
      'A_PUNTO_DE_VENCER:2026-10-25',
      'A_PUNTO_DE_VENCER:2026-11-05',
      'PROXIMA_A_RENOVAR:2026-12-01',
      'VENCIDA:2026-04-03',
      'VIGENTE:2027-05-01',
      'RENOVADA:2026-01-01',
      'NO_RENOVADA:2026-02-01',
    ]);
  });

  it('Given la lista original, When se ordena, Then no la modifica', () => {
    const original = [p('VIGENTE', '2027-01-01'), p('A_PUNTO_DE_VENCER', '2026-10-25')];
    ordenarPorUrgencia(original);
    expect(original[0].estado).toBe('VIGENTE');
  });

  it('Given un estado desconocido, When se prioriza, Then va con lo cerrado', () => {
    expect(prioridadRenovacion({ estado: 'OTRO' })).toBe(4);
  });

  it('Given cada caso, When se pide la acción, Then el botón dice qué hacer', () => {
    expect(accionRenovacion(p('A_PUNTO_DE_VENCER', '2026-11-01'))).toBe('Renovar');
    expect(accionRenovacion(p('VENCIDA', '2026-01-01'))).toBe('Inducción');
    expect(accionRenovacion(p('RENOVADA', '2026-01-01'))).toBe('Ver detalle');
    expect(accionRenovacion(p('NO_RENOVADA', '2026-01-01'))).toBe('Ver detalle');
    expect(accionRenovacion(p('A_PUNTO_DE_VENCER', '2026-11-01', 'Corrección pendiente'))).toBe('Corregir');
  });
});
