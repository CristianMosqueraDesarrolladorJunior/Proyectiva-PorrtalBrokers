import * as fc from 'fast-check';

import { departamentoBloqueado } from './cobertura-ciudades';

describe('departamentoBloqueado (cobertura nacional: solo Antioquia)', () => {
  it.each(['Antioquia', 'ANTIOQUIA', '  antioquia ', 'ÁNTIOQUIA'])(
    'Given %p, When se evalúa, Then queda bloqueado',
    (departamento) => {
      expect(departamentoBloqueado(departamento)).toBe(true);
    },
  );

  it.each(['Bogotá D.C.', 'Cundinamarca', 'Valle del Cauca', 'Santander', 'Amazonas', 'San Andrés y Providencia'])(
    'Given %p, When se evalúa, Then se permite',
    (departamento) => {
      expect(departamentoBloqueado(departamento)).toBe(false);
    },
  );

  it('Given vacío o nulo, When se evalúa, Then no bloquea', () => {
    expect(departamentoBloqueado('')).toBe(false);
    expect(departamentoBloqueado(null)).toBe(false);
    expect(departamentoBloqueado(undefined)).toBe(false);
  });

  it('Given cualquier texto que no sea Antioquia, When se evalúa, Then nunca bloquea (propiedad)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (texto) => {
        fc.pre(texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase() !== 'ANTIOQUIA');
        return departamentoBloqueado(texto) === false;
      }),
    );
  });
});
