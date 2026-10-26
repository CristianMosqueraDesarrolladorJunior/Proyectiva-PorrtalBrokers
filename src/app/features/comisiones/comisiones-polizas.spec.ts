import type { EstadoCobro, PolizaExpedida } from '../../core/models/comisiones.model';
import { esCobrable, fechaCorta, filaPoliza, filtrarPolizas } from './comisiones-polizas';

const poliza = (numero: string, estadoPago: EstadoCobro, fechaEmision: string | null, valorPoliza = 1_190_000): PolizaExpedida => ({
  numeroPoliza: numero,
  fechaEmision,
  estadoPago,
  fechaPago: estadoPago === 'PAGADA' ? '2026-10-05' : null,
  fechaLimiteCobro: '2027-01-20',
  valorPoliza,
  porcentaje: 20,
  comision: Math.round(valorPoliza / 1.19 * 0.2),
  ordenPago: estadoPago === 'PAGADA' ? 'OP-1' : '',
});

const POLIZAS = [
  poliza('5010000000001', 'PENDIENTE', '2026-08-20'),
  poliza('5010000000002', 'PAGADA', '2026-09-10'),
  poliza('5010000000003', 'EN_COBRO', '2026-10-01'),
  poliza('5010000000004', 'FUERA_PLAZO', null),
];

describe('comisiones-polizas', () => {
  it('Given las pólizas, When se pregunta cuáles se cobran, Then solo las pendientes por cobrar', () => {
    expect(POLIZAS.filter(esCobrable).map((p) => p.numeroPoliza)).toEqual(['5010000000001']);
  });

  it('Given un estado, When se filtra, Then quedan solo las de ese estado', () => {
    expect(filtrarPolizas(POLIZAS, { estado: 'PAGADA', desde: '', hasta: '' }).map((p) => p.numeroPoliza)).toEqual(['5010000000002']);
  });

  it('Given un rango de emisión, When se filtra, Then incluye ambos extremos y excluye las sin fecha', () => {
    const r = filtrarPolizas(POLIZAS, { estado: '', desde: '2026-09-10', hasta: '2026-10-01' });
    expect(r.map((p) => p.numeroPoliza)).toEqual(['5010000000002', '5010000000003']);
  });

  it('Given sin filtros, When se filtra, Then devuelve todas', () => {
    expect(filtrarPolizas(POLIZAS, { estado: '', desde: '', hasta: '' })).toHaveLength(4);
  });

  it('Given una póliza, When se arma su fila, Then trae el valor real para ordenar y solo las pendientes son elegibles', () => {
    const pendiente = filaPoliza(POLIZAS[0]);
    expect(pendiente['emision']).toBe('20/08/2026');
    expect(pendiente['emisionOrden']).toBe('2026-08-20');
    expect(pendiente['valorOrden']).toBe(1_190_000);
    expect(pendiente['seleccionable']).toBe(1);
    expect(pendiente['estadoVariante']).toBe('warning');
    expect(filaPoliza(POLIZAS[1])['seleccionable']).toBe(0);
    expect(filaPoliza(POLIZAS[1])['estadoVariante']).toBe('success');
  });

  it('Given un valor desconocido, When se arma la fila, Then no inventa montos', () => {
    const fila = filaPoliza(poliza('5010000000009', 'PENDIENTE', '2026-08-20', 0));
    expect(fila['valor']).toBe('—');
    expect(fila['comision']).toBe('—');
  });

  it('Given una fecha vacía o inválida, When se formatea, Then no inventa un valor', () => {
    expect(fechaCorta(null)).toBe('—');
    expect(fechaCorta('xx')).toBe('—');
  });
});
