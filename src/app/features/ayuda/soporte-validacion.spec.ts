import { validarSoporte } from './soporte-validacion';

describe('validarSoporte', () => {
  it('acepta asunto y observación suficientes', () => {
    expect(validarSoporte('No carga mi póliza', 'Al abrir la póliza sale en blanco desde ayer', ['POLIZA'])).toEqual({});
  });

  it('rechaza textos cortos o vacíos', () => {
    expect(Object.keys(validarSoporte('  ', 'corto', []))).toEqual(['areas', 'asunto', 'observacion']);
  });

  it('rechaza textos que pasan el máximo', () => {
    expect(validarSoporte('a'.repeat(201), 'b'.repeat(2001), ['POLIZA'])).toHaveProperty('asunto');
    expect(validarSoporte('asunto ok', 'b'.repeat(2001), ['POLIZA'])).toHaveProperty('observacion');
  });
});
