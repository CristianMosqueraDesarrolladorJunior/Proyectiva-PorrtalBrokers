import { esMotivoNoRenovacionValido, puedeEnviarNoRenovacion } from './no-renovacion-habilitacion';

/** Motivos reales del Warehouse de renovaciones (vienen del catálogo `motivo_no_renovacion`). */
const MOTIVOS = ['Desocupación', 'Venta inmueble', 'No renueva'];

describe('no-renovacion-habilitacion (lógica pura con catálogo, Req 22.1, 22.3)', () => {
  it('acepta solo motivos del catálogo', () => {
    for (const motivo of MOTIVOS) {
      expect(esMotivoNoRenovacionValido(motivo, MOTIVOS)).toBe(true);
    }
    expect(esMotivoNoRenovacionValido(undefined, MOTIVOS)).toBe(false);
    expect(esMotivoNoRenovacionValido('', MOTIVOS)).toBe(false);
    expect(esMotivoNoRenovacionValido('desocupación', MOTIVOS)).toBe(false);
  });

  it('habilita el envío solo con un motivo válido', () => {
    expect(puedeEnviarNoRenovacion('Desocupación', MOTIVOS)).toBe(true);
    expect(puedeEnviarNoRenovacion(undefined, MOTIVOS)).toBe(false);
    expect(puedeEnviarNoRenovacion('Desocupación', [])).toBe(false);
  });
});
