import type { LecturaContratoResponse, PrellenadoContrato } from '../../../../core/models/contrato.model';
import {
  completarDatos,
  DATOS_CONTRATO_VACIOS,
  DatosContratoFirmado,
  datosDeEstudio,
  datosDeLectura,
  datosFaltantes,
  solicitudDeContrato,
} from './datos-contrato-firmado';

const CIUDADES = ['Bogotá D.C.', 'Medellín'];
const CATALOGOS = { ciudades: CIUDADES, usoVivienda: 'Vivienda', usoComercio: 'Comercial' };
const HOY = new Date('2026-11-18T12:00:00');
const PROPIETARIO = { tipo: 'CC' as const, numero: '79111222' };
const INQUILINO = { tipo: 'CC' as const, numero: '1010333444' };

const lectura = (parcial: Partial<LecturaContratoResponse> = {}): LecturaContratoResponse => ({
  firmado: true,
  arrendador: { nombres: 'Ana', apellidos: 'Pérez' },
  arrendatario: { nombres: 'Luis', apellidos: 'Gómez' },
  inmueble: { direccionCompleta: 'Cra 7 # 10-20', ciudad: 'bogota d.c.', uso: 'Vivienda' },
  condiciones: { canonMensual: 1_500_000, fechaInicio: '2026-12-05', duracionMeses: 12 },
  falta: [],
  ...parcial,
} as LecturaContratoResponse);

const completos: DatosContratoFirmado = {
  ...DATOS_CONTRATO_VACIOS,
  propietarioNombres: 'Ana', propietarioApellidos: 'Pérez', inquilinoNombres: 'Luis', inquilinoApellidos: 'Gómez',
  direccion: 'Cra 7 # 10-20', ciudad: 'Bogotá D.C.', uso: 'VIVIENDA', canon: '1500000', fechaInicio: '2026-12-05',
  duracionMeses: '12', diaPago: '5', formaPago: 'efectivo',
};

describe('datos del contrato firmado', () => {
  it('Given un contrato firmado sin número de cuenta, When se lee, Then trae sus datos y solo pide la forma de pago', () => {
    const datos = completarDatos(DATOS_CONTRATO_VACIOS, datosDeLectura(lectura(), CIUDADES));
    expect(datos.ciudad).toBe('Bogotá D.C.');
    expect(datos.diaPago).toBe('5');
    expect(datosFaltantes(datos, PROPIETARIO, INQUILINO, HOY)).toEqual(['formaPago']);
  });

  it('Given el contrato y el estudio, When se completan, Then el contrato manda y el estudio solo llena lo vacío', () => {
    const estudio = {
      arrendatario: { nombres: 'Otro', apellidos: 'Nombre' },
      inmueble: { direccion: 'Calle 1', ciudad: 'Medellín', uso: 'Vivienda', tipoInmueble: null, canon: '2000000', administracion: '150000' },
      deudores: [],
    } as unknown as PrellenadoContrato;
    const datos = completarDatos(completarDatos(DATOS_CONTRATO_VACIOS, datosDeLectura(lectura(), CIUDADES)), datosDeEstudio(estudio, CIUDADES));
    expect(datos.inquilinoNombres).toBe('Luis');
    expect(datos.canon).toBe('1500000');
    expect(datos.administracion).toBe('150000');
  });

  it('Given una lectura fallida, When solo hay estudio, Then lo que no trae queda pendiente para el broker', () => {
    const faltan = datosFaltantes(DATOS_CONTRATO_VACIOS, PROPIETARIO, INQUILINO, HOY);
    expect(faltan).toContain('propietarioNombres');
    expect(faltan).toContain('fechaInicio');
    expect(faltan).not.toContain('numeroCuenta');
  });

  it('Given transferencia, When no hay cuenta válida, Then la pide; con efectivo no', () => {
    expect(datosFaltantes({ ...completos, formaPago: 'transferencia', numeroCuenta: '12' }, PROPIETARIO, INQUILINO, HOY))
      .toEqual(['numeroCuenta']);
    expect(datosFaltantes(completos, PROPIETARIO, INQUILINO, HOY)).toEqual([]);
  });

  it('Given una fecha de inicio de hace más de 90 días, When se valida, Then la rechaza como el backend', () => {
    expect(datosFaltantes({ ...completos, fechaInicio: '2026-07-01' }, PROPIETARIO, INQUILINO, HOY)).toEqual(['fechaInicio']);
  });

  it('Given un propietario con NIT, When se valida, Then no exige apellidos y lo marca como persona jurídica', () => {
    const nit = { tipo: 'NIT' as const, numero: '900123456' };
    const datos = { ...completos, propietarioNombres: 'INMOBILIARIA 360 S.A.S.', propietarioApellidos: '' };
    expect(datosFaltantes(datos, nit, INQUILINO, HOY)).toEqual([]);
    const req = solicitudDeContrato(datos, { propietario: nit, inquilino: INQUILINO }, CATALOGOS);
    expect(req?.arrendador.tipoPersona).toBe('JURIDICA');
    expect(req?.arrendador.apellidos).toBe('');
  });

  it('Given datos confirmados, When se arma el contrato, Then usa los documentos de la solicitud y la cotización', () => {
    const req = solicitudDeContrato(completos, {
      propietario: PROPIETARIO, inquilino: INQUILINO, cotizacionReferencia: 'COT-1', tipoFirma: 'ELECTRONICA', numeroEstudio: '123',
    }, CATALOGOS)!;
    expect(req.arrendador.numeroIdentificacion).toBe('79111222');
    expect(req.arrendatario.numeroIdentificacion).toBe('1010333444');
    expect(req.condiciones).toMatchObject({ canonMensual: 1_500_000, metodoPago: 'efectivo', diaPagoMensual: 5, duracionMeses: 12 });
    expect(req.condiciones.numeroCuenta).toBeUndefined();
    expect(req.cotizacionReferencia).toBe('COT-1');
    expect(req.adicionales).toMatchObject({ tipoFirma: 'ELECTRONICA', numeroSolicitud: '123' });
  });

  it('Given algo pendiente, When se arma el contrato, Then no hay contrato que enviar', () => {
    expect(solicitudDeContrato({ ...completos, canon: '' }, { propietario: PROPIETARIO, inquilino: INQUILINO }, CATALOGOS)).toBeNull();
  });
});
