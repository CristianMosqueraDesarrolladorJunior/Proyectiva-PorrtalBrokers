import { duracionTexto, vencida } from './soporte.service';

describe('soporte: temporizador', () => {
  const t0 = '2026-10-28T10:00:00Z';
  const mas = (min: number) => new Date(new Date(t0).getTime() + min * 60000).toISOString();

  it('formatea minutos, horas y días', () => {
    expect(duracionTexto(t0, mas(5))).toBe('5 min');
    expect(duracionTexto(t0, mas(200))).toBe('3 h 20 min');
    expect(duracionTexto(t0, mas(60 * 50))).toBe('2 d 2 h');
  });

  it('vence solo si está pendiente y pasó la meta', () => {
    const ahora = new Date(mas(25 * 60)).getTime();
    expect(vencida({ estado: 'PENDIENTE', creadoEn: t0 }, ahora, 24)).toBe(true);
    expect(vencida({ estado: 'SOLVENTADO', creadoEn: t0 }, ahora, 24)).toBe(false);
    expect(vencida({ estado: 'PENDIENTE', creadoEn: t0 }, ahora, 48)).toBe(false);
  });
});
