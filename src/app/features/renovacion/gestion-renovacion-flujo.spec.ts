import {
  ETAPAS_POR_FLUJO,
  PASOS_POR_FLUJO,
  esSarlaftVigente,
  etapaAnterior,
  indicePaso,
  siguienteEtapa,
  type FlujoGestion,
} from './gestion-renovacion-flujo';

const FLUJOS: readonly FlujoGestion[] = ['digital', 'fisica', 'caso-especial', 'no-renovar', 'correccion'];

describe('gestion-renovacion-flujo (proceso real de renovaciones)', () => {
  it('todas las gestiones pasan por SARLAFT justo antes del éxito', () => {
    for (const flujo of FLUJOS) {
      const etapas = ETAPAS_POR_FLUJO[flujo];
      expect(etapas[etapas.length - 1]).toBe('exito');
      expect(etapas[etapas.length - 2]).toBe('sarlaft');
    }
  });

  it('la renovación física no pasa por detalles ni ajuste', () => {
    expect(ETAPAS_POR_FLUJO.fisica).not.toContain('detalles');
    expect(ETAPAS_POR_FLUJO.fisica).not.toContain('ajuste');
  });

  it('el stepper tiene una etiqueta por etapa', () => {
    for (const flujo of FLUJOS) {
      expect(PASOS_POR_FLUJO[flujo].length).toBe(ETAPAS_POR_FLUJO[flujo].length);
    }
  });

  it('avanza y retrocede dentro del flujo', () => {
    expect(siguienteEtapa('digital', 'ajuste')).toBe('sarlaft');
    expect(siguienteEtapa('correccion', 'captura')).toBe('observaciones');
    expect(siguienteEtapa('fisica', 'exito')).toBe('exito');
    expect(etapaAnterior('digital', 'ajuste')).toBe('detalles');
    expect(etapaAnterior('fisica', 'opciones')).toBe('opciones');
    expect(indicePaso('no-renovar', 'sarlaft')).toBe(2);
  });

  it('SARLAFT vigente solo con menos de 36 meses', () => {
    expect(esSarlaftVigente(0)).toBe(true);
    expect(esSarlaftVigente(35)).toBe(true);
    expect(esSarlaftVigente(36)).toBe(false);
    expect(esSarlaftVigente(50)).toBe(false);
    expect(esSarlaftVigente(-1)).toBe(false);
  });
});
