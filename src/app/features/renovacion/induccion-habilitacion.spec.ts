import {
  PARTE_VACIA,
  esPolizaVencida,
  partesDesdeLectura,
  revisarInduccion,
  revisarParte,
} from './induccion-habilitacion';

const COMPLETA = {
  nombre: 'Ana María Ruiz',
  tipoIdentificacion: 'CC',
  numeroIdentificacion: '1023018112',
  telefono: '300 123 4567',
  correo: 'ana@correo.co',
};

describe('induccion-habilitacion', () => {
  const hoy = new Date(2026, 9, 9);

  it('detecta pólizas vencidas por estado o por fecha', () => {
    expect(esPolizaVencida({ estado: 'Vencida', fechaVencimiento: '2027-01-01' }, hoy)).toBe(true);
    expect(esPolizaVencida({ estado: 'Próxima a renovar', fechaVencimiento: '2026-10-08' }, hoy)).toBe(true);
    expect(esPolizaVencida({ estado: 'Próxima a renovar', fechaVencimiento: '2026-10-09' }, hoy)).toBe(false);
    expect(esPolizaVencida({ estado: 'Renovada', fechaVencimiento: 'sin fecha' }, hoy)).toBe(false);
  });

  it('acepta una parte completa y señala cada dato inválido', () => {
    expect(revisarParte('propietario', COMPLETA)).toEqual([]);
    expect(revisarParte('inquilino', PARTE_VACIA)).toHaveLength(4);
  });

  it('exige el deudor solo si se incluye, y los dos archivos', () => {
    const partes = { propietario: COMPLETA, inquilino: COMPLETA, deudorSolidario: PARTE_VACIA };
    expect(revisarInduccion(partes, false, true, true)).toEqual([]);
    expect(revisarInduccion(partes, true, true, true)).toHaveLength(4);
    expect(revisarInduccion(partes, false, false, false)).toEqual([
      'Carga el contrato de arrendamiento.',
      'Carga el paz y salvo del inquilino.',
    ]);
  });

  it('precarga solo lo leído sin borrar lo ya escrito', () => {
    const actuales = { propietario: COMPLETA, inquilino: PARTE_VACIA, deudorSolidario: PARTE_VACIA };
    const r = partesDesdeLectura(actuales, {
      arrendador: { telefono: '3109998877' },
      arrendatario: { nombres: 'Luis', apellidos: 'Gómez', numeroIdentificacion: '79123456' },
      inmueble: {},
      condiciones: {},
      falta: [],
    });
    expect(r.propietario).toEqual({ ...COMPLETA, telefono: '3109998877' });
    expect(r.inquilino.nombre).toBe('Luis Gómez');
    expect(r.inquilino.numeroIdentificacion).toBe('79123456');
    expect(r.deudorSolidario).toEqual(PARTE_VACIA);
  });
});
