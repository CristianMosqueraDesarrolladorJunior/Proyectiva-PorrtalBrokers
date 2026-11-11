import { enMantenimiento } from './mantenimiento';

describe('enMantenimiento', () => {
  it('en local (lista vacía) todo queda habilitado', () => {
    expect(enMantenimiento('renovaciones', '')).toBe(false);
    expect(enMantenimiento('agente', '')).toBe(false);
  });

  it('en producción bloquea solo los módulos de la lista', () => {
    const lista = 'renovaciones comisiones agente';
    expect(enMantenimiento('renovaciones', lista)).toBe(true);
    expect(enMantenimiento('comisiones', lista)).toBe(true);
    expect(enMantenimiento('agente', lista)).toBe(true);
    expect(enMantenimiento('seguimiento', lista)).toBe(false);
  });

  it('sin config.js (pruebas) no bloquea nada', () => {
    expect(enMantenimiento('comisiones')).toBe(false);
  });
});
