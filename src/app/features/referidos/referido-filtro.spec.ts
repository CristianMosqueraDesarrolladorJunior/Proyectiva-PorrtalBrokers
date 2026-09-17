import { filtrarReferidos, coincideBusqueda, coincideEstado } from './referido-filtro';
import type { Referido } from '../../core/services/referidos.service';

const referidos: readonly Referido[] = [
  { nombre: 'Ana López', producto: 'Arrendamiento', estado: 'Aceptada', fecha: '2026-01-01' },
  { nombre: 'Beto Ruiz', producto: 'Vida', estado: 'En proceso', fecha: '2026-01-02' },
  { nombre: 'Carla Díaz', producto: 'Hogar', estado: 'Rechazada', fecha: '2026-01-03' },
  { nombre: 'Ana María', producto: 'Vida', estado: 'Aceptada', fecha: '2026-01-04' },
];

describe('referido-filtro (lógica pura, Req 15.5)', () => {
  describe('coincideBusqueda', () => {
    it('no filtra cuando la búsqueda es vacía o undefined', () => {
      expect(coincideBusqueda(referidos[0], undefined)).toBe(true);
      expect(coincideBusqueda(referidos[0], '   ')).toBe(true);
    });

    it('coincide por nombre o producto, insensible a mayúsculas', () => {
      expect(coincideBusqueda(referidos[0], 'ana')).toBe(true);
      expect(coincideBusqueda(referidos[1], 'VIDA')).toBe(true);
      expect(coincideBusqueda(referidos[0], 'vida')).toBe(false);
    });
  });

  describe('coincideEstado', () => {
    it('no filtra cuando el estado es vacío o undefined', () => {
      expect(coincideEstado(referidos[0], undefined)).toBe(true);
      expect(coincideEstado(referidos[0], '')).toBe(true);
    });

    it('coincide de forma exacta insensible a mayúsculas', () => {
      expect(coincideEstado(referidos[0], 'aceptada')).toBe(true);
      expect(coincideEstado(referidos[1], 'Aceptada')).toBe(false);
    });
  });

  describe('filtrarReferidos', () => {
    it('devuelve todos cuando no hay filtros', () => {
      const resultado = filtrarReferidos(referidos, {});
      expect(resultado).toHaveLength(referidos.length);
    });

    it('filtra por texto preservando el orden', () => {
      const resultado = filtrarReferidos(referidos, { busqueda: 'ana' });
      expect(resultado.map((r) => r.nombre)).toEqual(['Ana López', 'Ana María']);
    });

    it('filtra por estado', () => {
      const resultado = filtrarReferidos(referidos, { estado: 'Aceptada' });
      expect(resultado).toHaveLength(2);
      expect(resultado.every((r) => r.estado === 'Aceptada')).toBe(true);
    });

    it('combina texto y estado (correcto y completo, sin duplicados)', () => {
      const resultado = filtrarReferidos(referidos, { busqueda: 'ana', estado: 'Aceptada' });
      expect(resultado.map((r) => r.nombre)).toEqual(['Ana López', 'Ana María']);
    });

    it('no introduce elementos ausentes de la lista original', () => {
      const resultado = filtrarReferidos(referidos, { busqueda: 'a' });
      resultado.forEach((r) => expect(referidos).toContain(r));
    });
  });
});
