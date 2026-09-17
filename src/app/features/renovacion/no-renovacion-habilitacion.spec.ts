import {
  ETIQUETA_MOTIVO_NO_RENOVACION,
  MOTIVOS_NO_RENOVACION,
  esMotivoNoRenovacionValido,
  puedeEnviarNoRenovacion,
} from './no-renovacion-habilitacion';

describe('no-renovacion-habilitacion (lógica pura, Req 22.1, 22.3)', () => {
  describe('MOTIVOS_NO_RENOVACION', () => {
    it('define exactamente los 4 motivos del conjunto cerrado', () => {
      // Given / When / Then
      expect([...MOTIVOS_NO_RENOVACION].sort()).toEqual(
        ['cambioProveedor', 'costoElevado', 'insatisfaccionServicio', 'yaNoNecesita'].sort(),
      );
    });

    it('tiene una etiqueta legible por cada motivo', () => {
      for (const motivo of MOTIVOS_NO_RENOVACION) {
        expect(ETIQUETA_MOTIVO_NO_RENOVACION[motivo]?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('esMotivoNoRenovacionValido', () => {
    it('acepta cada motivo del conjunto definido', () => {
      for (const motivo of MOTIVOS_NO_RENOVACION) {
        expect(esMotivoNoRenovacionValido(motivo)).toBe(true);
      }
    });

    it('rechaza undefined, vacío y valores fuera del conjunto', () => {
      expect(esMotivoNoRenovacionValido(undefined)).toBe(false);
      expect(esMotivoNoRenovacionValido('')).toBe(false);
      expect(esMotivoNoRenovacionValido('otroMotivo')).toBe(false);
      expect(esMotivoNoRenovacionValido('costoelevado')).toBe(false);
    });
  });

  describe('puedeEnviarNoRenovacion', () => {
    it('habilita el envío solo con un motivo válido, sin importar observaciones', () => {
      // Given / When / Then — con motivo válido, habilitado
      expect(puedeEnviarNoRenovacion('costoElevado')).toBe(true);
    });

    it('impide el envío sin motivo seleccionado', () => {
      expect(puedeEnviarNoRenovacion(undefined)).toBe(false);
      expect(puedeEnviarNoRenovacion('')).toBe(false);
    });

    it('impide el envío con un motivo fuera del conjunto definido', () => {
      expect(puedeEnviarNoRenovacion('costoBajo')).toBe(false);
    });
  });
});
