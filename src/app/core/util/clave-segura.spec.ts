import { esClaveSegura } from './clave-segura';

describe('esClaveSegura', () => {
  it('acepta una clave común de 8+ caracteres y rechaza las triviales', () => {
    expect(esClaveSegura('Arriendo-2026')).toBe(true);
    expect(esClaveSegura('aaaaaaaa')).toBe(false);
    expect(esClaveSegura('password')).toBe(false);
    expect(esClaveSegura('12345678')).toBe(false);
    expect(esClaveSegura('corta')).toBe(false);
    expect(esClaveSegura('1099555002', '1099555002')).toBe(false);
  });
});
