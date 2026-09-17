import {
  decrementarMonto,
  incrementarMonto,
  MONTO_MINIMO_COBERTURA,
  normalizarMonto,
  PASO_MONTO_COBERTURA,
} from './monto-escalonado';

describe('monto-escalonado (Req 7.6, 14.4)', () => {
  describe('normalizarMonto', () => {
    it('acota valores no positivos al mínimo $0', () => {
      // Given / When / Then
      expect(normalizarMonto(-500_000)).toBe(0);
      expect(normalizarMonto(0)).toBe(0);
      expect(normalizarMonto(Number.NaN)).toBe(0);
    });

    it('trunca al múltiplo de $500.000 inferior más cercano', () => {
      // Given / When / Then
      expect(normalizarMonto(750_000)).toBe(500_000);
      expect(normalizarMonto(1_000_000)).toBe(1_000_000);
    });
  });

  describe('incrementarMonto', () => {
    it('suma un paso de $500.000', () => {
      // Given / When / Then
      expect(incrementarMonto(0)).toBe(PASO_MONTO_COBERTURA);
      expect(incrementarMonto(1_000_000)).toBe(1_500_000);
    });
  });

  describe('decrementarMonto', () => {
    it('resta un paso de $500.000 sin bajar de $0', () => {
      // Given / When / Then
      expect(decrementarMonto(1_000_000)).toBe(500_000);
      expect(decrementarMonto(0)).toBe(MONTO_MINIMO_COBERTURA);
      expect(decrementarMonto(500_000)).toBe(0);
    });
  });

  it('el resultado siempre es no negativo y múltiplo de $500.000', () => {
    // Given
    let monto = 1_500_000;
    // When — secuencia arbitraria de decrementos
    for (let i = 0; i < 10; i += 1) {
      monto = decrementarMonto(monto);
      // Then
      expect(monto).toBeGreaterThanOrEqual(0);
      expect(monto % PASO_MONTO_COBERTURA).toBe(0);
    }
  });
});
