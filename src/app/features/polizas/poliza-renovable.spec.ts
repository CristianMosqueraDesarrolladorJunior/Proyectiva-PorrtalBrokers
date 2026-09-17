import { esPolizaRenovable } from './poliza-renovable';

/**
 * Pruebas unitarias de `esPolizaRenovable` (Req 16.4).
 * Given/When/Then: dado un estado de Poliza, cuando se evalúa la habilitación de
 * la Renovacion, entonces solo "Próxima a renovar" y "A punto de vencer" la habilitan.
 */
describe('esPolizaRenovable', () => {
  it('habilita la renovación para "Próxima a renovar"', () => {
    // Given / When / Then
    expect(esPolizaRenovable('Próxima a renovar')).toBe(true);
  });

  it('habilita la renovación para "A punto de vencer"', () => {
    expect(esPolizaRenovable('A punto de vencer')).toBe(true);
  });

  it('no habilita la renovación para una póliza "Renovada"', () => {
    expect(esPolizaRenovable('Renovada')).toBe(false);
  });

  it('no habilita la renovación para un estado desconocido', () => {
    expect(esPolizaRenovable('Cancelada')).toBe(false);
    expect(esPolizaRenovable('')).toBe(false);
  });
});
