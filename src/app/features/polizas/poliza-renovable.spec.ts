import { esPolizaRenovable } from './poliza-renovable';

/** Estados renovables del catálogo `estado_poliza` (código o etiqueta). */
const RENOVABLES = ['PROXIMA_A_RENOVAR', 'Próxima a renovar', 'A_PUNTO_DE_VENCER', 'A punto de vencer'];

/**
 * Pruebas unitarias de `esPolizaRenovable` (Req 16.4).
 * Given/When/Then: dado un estado de Poliza, cuando se evalúa la habilitación de
 * la Renovacion, entonces solo "Próxima a renovar" y "A punto de vencer" la habilitan.
 */
describe('esPolizaRenovable', () => {
  it('habilita la renovación para "Próxima a renovar"', () => {
    // Given / When / Then
    expect(esPolizaRenovable('Próxima a renovar', RENOVABLES)).toBe(true);
  });

  it('habilita la renovación para "A punto de vencer"', () => {
    expect(esPolizaRenovable('A punto de vencer', RENOVABLES)).toBe(true);
  });

  it('no habilita la renovación para una póliza "Renovada"', () => {
    expect(esPolizaRenovable('Renovada', RENOVABLES)).toBe(false);
  });

  it('no habilita la renovación para un estado desconocido', () => {
    expect(esPolizaRenovable('Cancelada', RENOVABLES)).toBe(false);
    expect(esPolizaRenovable('', RENOVABLES)).toBe(false);
  });
});
