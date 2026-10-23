import { seccionesDatosRenovacion } from './datos-renovacion';

describe('seccionesDatosRenovacion', () => {
  it('muestra todos los campos del JSON con nombre del negocio, pesos y sin vacíos', () => {
    const secciones = seccionesDatosRenovacion({
      poliza: '5010002491002', canon: 2220000.0, costo: 'NaN', celular: 3153334757.0,
      vencimiento: '2026-12-30', campoNuevo: 'algo', id: 99, motivoNoRenovacion: '', mesVencimientoPoliza: 'January/2026',
    });
    const datos = secciones.flatMap((s) => s.datos);
    const valor = (etiqueta: string) => datos.find((d) => d.etiqueta === etiqueta)?.valor;

    expect(valor('Número de póliza')).toBe('5010002491002');
    expect(String(valor('Canon'))).toMatch(/2\.220\.000/);
    expect(valor('Celular')).toBe('3153334757');
    expect(valor('Vencimiento')).toMatch(/2026/);
    expect(valor('Campo nuevo')).toBe('algo');
    expect(valor('Mes de vencimiento')).toBe('Enero/2026');
    expect(datos.some((d) => d.etiqueta === 'Costo de la póliza' || d.etiqueta === 'Motivo de no renovación')).toBe(false);
    expect(datos.some((d) => d.valor === 99)).toBe(false);
  });

  it('sin datos no agrega secciones', () => {
    expect(seccionesDatosRenovacion(null)).toEqual([]);
  });
});
