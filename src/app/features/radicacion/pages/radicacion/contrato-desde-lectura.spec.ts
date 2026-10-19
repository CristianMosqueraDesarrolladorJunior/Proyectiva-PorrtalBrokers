import type { LecturaContratoResponse } from '../../../../core/models/contrato.model';
import { contratoDesdeLectura } from './contrato-desde-lectura';

describe('contratoDesdeLectura', () => {
  const catalogos = { ciudades: ['Bogotá D.C.', 'Chía'], usoVivienda: 'Vivienda', usoComercio: 'Comercial' };
  const completa: LecturaContratoResponse = {
    firmado: true,
    arrendador: { nombres: 'Ana', apellidos: 'Ruiz', tipoIdentificacion: 'CC', numeroIdentificacion: '52804998' },
    arrendatario: { nombres: 'Luis', apellidos: 'Gómez', tipoIdentificacion: 'CC', numeroIdentificacion: '79111222' },
    inmueble: { direccionCompleta: 'CL 1 2 3', ciudad: 'chia', uso: 'vivienda' },
    condiciones: { canonMensual: 1500000, fechaInicio: '2026-11-07', numeroCuenta: '123456789', banco: 'Bancolombia' },
    falta: [],
  } as LecturaContratoResponse;

  it('arma el contrato con la ciudad del catálogo, día de pago de la fecha y notificación en el inmueble', () => {
    const req = contratoDesdeLectura(completa, catalogos)!;
    expect(req.inmueble.ciudad).toBe('Chía');
    expect(req.inmueble.uso).toBe('Vivienda');
    expect(req.condiciones.diaPagoMensual).toBe(7);
    expect(req.condiciones.reajusteAnual).toBe('IPC');
    expect(req.arrendatario.direccionNotificacion).toBe('CL 1 2 3');
    expect(contratoDesdeLectura(completa, catalogos, 'FISICA')!.adicionales?.tipoFirma).toBe('FISICA');
  });

  it('devuelve null si falta lo que el backend exige (cuenta o ciudad sin cobertura)', () => {
    expect(contratoDesdeLectura({ ...completa, condiciones: { ...completa.condiciones, numeroCuenta: undefined } }, catalogos)).toBeNull();
    expect(contratoDesdeLectura({ ...completa, inmueble: { ...completa.inmueble, ciudad: 'Medellín' } }, catalogos)).toBeNull();
  });
});
