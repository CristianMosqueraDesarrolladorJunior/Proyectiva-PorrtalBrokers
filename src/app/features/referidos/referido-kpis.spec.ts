import { calcularKpisReferidos } from './referido-kpis';
import type { Referido } from '../../core/services/referidos.service';

const referidos: readonly Referido[] = [
  { nombre: 'Ana', producto: 'Arrendamiento', estado: 'Aceptada', fecha: '2026-01-01' },
  { nombre: 'Beto', producto: 'Vida', estado: 'En proceso', fecha: '2026-01-02' },
  { nombre: 'Carla', producto: 'Hogar', estado: 'Rechazada', fecha: '2026-01-03' },
  { nombre: 'Diego', producto: 'Vida', estado: 'Aceptada', fecha: '2026-01-04' },
];

describe('referido-kpis (lógica pura, Req 15.4)', () => {
  it('calcula total, aceptadas, en proceso y rechazadas', () => {
    // When
    const kpis = calcularKpisReferidos(referidos);
    // Then
    expect(kpis.total).toBe(4);
    expect(kpis.aceptadas).toBe(2);
    expect(kpis.enProceso).toBe(1);
    expect(kpis.rechazadas).toBe(1);
  });

  it('clasifica insensible a mayúsculas y variantes de "en proceso"', () => {
    const lista: Referido[] = [
      { nombre: 'A', producto: 'X', estado: 'ACEPTADA', fecha: '' },
      { nombre: 'B', producto: 'Y', estado: 'en_proceso', fecha: '' },
    ];
    const kpis = calcularKpisReferidos(lista);
    expect(kpis.aceptadas).toBe(1);
    expect(kpis.enProceso).toBe(1);
  });

  it('devuelve ceros para lista vacía', () => {
    const kpis = calcularKpisReferidos([]);
    expect(kpis).toEqual({ total: 0, aceptadas: 0, enProceso: 0, rechazadas: 0 });
  });
});
