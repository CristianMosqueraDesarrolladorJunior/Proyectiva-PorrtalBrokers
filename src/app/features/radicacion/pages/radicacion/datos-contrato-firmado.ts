import type {
  ContratoArrendamientoRequest,
  DuracionContratoMeses,
  LecturaContratoResponse,
  MetodoPagoContrato,
  PrellenadoContrato,
} from '../../../../core/models/contrato.model';
import type { TipoDocumentoIdentidad } from '../../../../core/models/radicacion.model';
import type { CotizacionParaRadicar } from '../../../../core/services/borrador-radicacion.service';

/** Catálogos con los que se valida el contrato (los mismos que acepta el backend). */
export interface CatalogosContrato {
  readonly ciudades: readonly string[];
  /** Descripción del uso de vivienda y de comercio en `uso_inmueble`. */
  readonly usoVivienda: string;
  readonly usoComercio: string;
}

/**
 * Datos del contrato firmado que respaldan la solicitud. Salen, en este orden, del contrato firmado leído, de lo que
 * el broker escribió en la solicitud y del estudio digital o la cotización; lo que falte lo escribe el broker aquí
 * mismo y lo confirma. Nunca se toma un contrato elaborado en el portal (esos no están firmados).
 */
export interface DatosContratoFirmado {
  readonly propietarioNombres: string;
  readonly propietarioApellidos: string;
  readonly inquilinoNombres: string;
  readonly inquilinoApellidos: string;
  readonly direccion: string;
  readonly ciudad: string;
  readonly uso: 'VIVIENDA' | 'COMERCIO' | '';
  readonly canon: string;
  readonly administracion: string;
  readonly fechaInicio: string;
  readonly duracionMeses: string;
  readonly diaPago: string;
  readonly formaPago: MetodoPagoContrato | '';
  readonly numeroCuenta: string;
  readonly tipoCuenta: string;
  readonly banco: string;
  /** Opcionales: se piden solo si el contrato no los trae y aplican al inmueble. */
  readonly matricula: string;
  readonly garaje: string;
  readonly deposito: string;
  /** Tipo de inmueble (apartamento, casa, local…): se toma del contrato o del estudio; no se pide. */
  readonly tipoInmueble: string;
}

/** Datos del inmueble que no siempre aplican: no bloquean el envío. */
export const DATOS_CONTRATO_OPCIONALES: readonly (keyof DatosContratoFirmado)[] = ['matricula', 'garaje', 'deposito'];

export const DATOS_CONTRATO_VACIOS: DatosContratoFirmado = {
  propietarioNombres: '', propietarioApellidos: '', inquilinoNombres: '', inquilinoApellidos: '',
  direccion: '', ciudad: '', uso: '', canon: '', administracion: '', fechaInicio: '', duracionMeses: '',
  diaPago: '', formaPago: '', numeroCuenta: '', tipoCuenta: '', banco: '', matricula: '', garaje: '', deposito: '', tipoInmueble: '',
};

/** Documento de una parte, tal como lo escribió el broker en la solicitud. */
export interface DocumentoParte {
  readonly tipo: TipoDocumentoIdentidad;
  readonly numero: string;
}

const lleno = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim().length > 0;
const sinTildes = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const numero = (v: number | string | null | undefined): string => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : '';
};
// Mismas reglas de nombre que el backend (ValidacionEntrada): persona natural y razón social.
const NOMBRE = /^\p{L}[\p{L} .'\-]{0,79}$/u;
const RAZON_SOCIAL = /^[\p{L}0-9][\p{L}0-9 .,&'\-]{0,119}$/u;
/**
 * La lectura a veces trae el nombre completo en «nombres» y sin apellidos. Con 2 o 4 palabras la partición es
 * inequívoca (1+1 o 2+2); con otra cantidad se deja igual y el broker escribe los apellidos.
 */
export function partirNombre(nombres: string | null | undefined, apellidos: string | null | undefined): [string, string] {
  const n = (nombres ?? '').trim();
  const a = (apellidos ?? '').trim();
  const palabras = n.split(/\s+/).filter(Boolean);
  if (a || (palabras.length !== 2 && palabras.length !== 4)) {
    return [n, a];
  }
  const corte = palabras.length / 2;
  return [palabras.slice(0, corte).join(' '), palabras.slice(corte).join(' ')];
}

/** Tipo de inmueble útil (descarta valores genéricos como «inmueble» que a veces trae la lectura). */
const tipoUtil = (t: string | null | undefined): string => (lleno(t) && !/^inmueble$/i.test(t.trim()) ? t.trim() : '');
const esComercio = (texto: string): boolean => /comerc|local|oficina|bodega/i.test(texto);

/** Ciudad del catálogo que corresponde al texto (sin tildes ni mayúsculas); vacío si no está. */
export function ciudadDeCatalogo(texto: string | null | undefined, ciudades: readonly string[]): string {
  return lleno(texto) ? ciudades.find((c) => sinTildes(c) === sinTildes(texto)) ?? '' : '';
}

/** Completa solo los campos vacíos de `actual` con los de `fuente`: lo que ya hay (o escribió el broker) se respeta. */
export function completarDatos(actual: DatosContratoFirmado, fuente: Partial<DatosContratoFirmado>): DatosContratoFirmado {
  const resultado: Record<string, string> = { ...actual };
  for (const [campo, valor] of Object.entries(fuente)) {
    if (lleno(valor as string) && !lleno(resultado[campo])) {
      resultado[campo] = (valor as string).trim();
    }
  }
  return resultado as unknown as DatosContratoFirmado;
}

/** Lo que trae el contrato firmado leído (la primera fuente). */
export function datosDeLectura(l: LecturaContratoResponse, ciudades: readonly string[]): Partial<DatosContratoFirmado> {
  const c = l.condiciones;
  const usoTexto = `${l.inmueble.uso ?? ''} ${l.inmueble.tipoInmueble ?? ''}`;
  const [propietarioNombres, propietarioApellidos] = partirNombre(l.arrendador.nombres, l.arrendador.apellidos);
  const [inquilinoNombres, inquilinoApellidos] = partirNombre(l.arrendatario.nombres, l.arrendatario.apellidos);
  return {
    propietarioNombres,
    propietarioApellidos,
    inquilinoNombres,
    inquilinoApellidos,
    direccion: l.inmueble.direccionCompleta ?? '',
    ciudad: ciudadDeCatalogo(l.inmueble.ciudad, ciudades),
    uso: usoTexto.trim() ? (esComercio(usoTexto) ? 'COMERCIO' : 'VIVIENDA') : '',
    canon: numero(c.canonMensual),
    administracion: numero(c.cuotaAdministracion),
    fechaInicio: /^\d{4}-\d{2}-\d{2}$/.test(c.fechaInicio ?? '') ? c.fechaInicio! : '',
    duracionMeses: numero(c.duracionMeses),
    diaPago: /^\d{4}-\d{2}-(\d{2})$/.exec(c.fechaInicio ?? '')?.[1]?.replace(/^0/, '') ?? '',
    formaPago: lleno(c.numeroCuenta) ? 'transferencia' : '',
    numeroCuenta: c.numeroCuenta ?? '',
    tipoCuenta: c.tipoCuenta ?? '',
    banco: c.banco ?? '',
    matricula: l.inmueble.matriculaInmobiliaria ?? '',
    tipoInmueble: tipoUtil(l.inmueble.tipoInmueble),
  };
}

/** Lo que trae el estudio digital aprobado: el inquilino y el inmueble (el estudio no trae al propietario). */
export function datosDeEstudio(p: PrellenadoContrato, ciudades: readonly string[]): Partial<DatosContratoFirmado> {
  const usoTexto = `${p.inmueble?.uso ?? ''} ${p.inmueble?.tipoInmueble ?? ''}`;
  return {
    inquilinoNombres: p.arrendatario?.nombres ?? '',
    inquilinoApellidos: p.arrendatario?.apellidos ?? '',
    direccion: p.inmueble?.direccion ?? '',
    ciudad: ciudadDeCatalogo(p.inmueble?.ciudad, ciudades),
    uso: usoTexto.trim() ? (esComercio(usoTexto) ? 'COMERCIO' : 'VIVIENDA') : '',
    canon: numero(p.inmueble?.canon),
    administracion: numero(p.inmueble?.administracion),
    tipoInmueble: tipoUtil(p.inmueble?.tipoInmueble),
  };
}

/** Lo que trae la cotización con la que el broker llegó a la solicitud. */
export function datosDeCotizacion(c: CotizacionParaRadicar, ciudades: readonly string[]): Partial<DatosContratoFirmado> {
  return {
    ciudad: ciudadDeCatalogo(c.ciudad, ciudades),
    uso: esComercio(c.tipoInmueble) ? 'COMERCIO' : 'VIVIENDA',
    canon: numero(c.canon),
    administracion: numero(c.administracion),
    fechaInicio: /^\d{4}-\d{2}-\d{2}/.test(c.fechaInicioVigencia) ? c.fechaInicioVigencia.slice(0, 10) : '',
    duracionMeses: numero(c.mesesVigencia),
    tipoInmueble: tipoUtil(c.tipoInmueble),
  };
}

/** Nombre visible de cada dato, para decirle al broker exactamente qué falta. */
export const ETIQUETAS_DATOS_CONTRATO: Readonly<Record<keyof DatosContratoFirmado, string>> = {
  propietarioNombres: 'Nombres del propietario',
  propietarioApellidos: 'Apellidos del propietario',
  inquilinoNombres: 'Nombres del inquilino',
  inquilinoApellidos: 'Apellidos del inquilino',
  direccion: 'Dirección del inmueble',
  ciudad: 'Ciudad del inmueble',
  uso: 'Uso del inmueble',
  canon: 'Canon mensual',
  administracion: 'Cuota de administración',
  fechaInicio: 'Fecha de inicio del contrato',
  duracionMeses: 'Duración del contrato',
  diaPago: 'Día de pago del canon',
  formaPago: 'Forma de pago del canon',
  numeroCuenta: 'Número de cuenta',
  tipoCuenta: 'Tipo de cuenta',
  banco: 'Banco',
  matricula: 'Matrícula inmobiliaria',
  garaje: 'Número de garaje',
  deposito: 'Número de depósito',
  tipoInmueble: 'Tipo de inmueble',
};

/**
 * Datos que faltan o no son válidos, con las reglas del backend (para no enviar solicitudes que luego rechace).
 * La persona jurídica (NIT) no lleva apellidos: su razón social va en «nombres».
 */
export function datosFaltantes(
  d: DatosContratoFirmado,
  propietario: DocumentoParte,
  inquilino: DocumentoParte,
  hoy: Date = new Date(),
): readonly (keyof DatosContratoFirmado)[] {
  const faltan: (keyof DatosContratoFirmado)[] = [];
  const exigir = (campo: keyof DatosContratoFirmado, ok: boolean) => { if (!ok) faltan.push(campo); };
  const nombres = (juridica: boolean, v: string) => (juridica ? RAZON_SOCIAL : NOMBRE).test(v.trim());
  const propJuridica = propietario.tipo === 'NIT';
  const inqJuridico = inquilino.tipo === 'NIT';
  exigir('propietarioNombres', nombres(propJuridica, d.propietarioNombres));
  exigir('propietarioApellidos', propJuridica || NOMBRE.test(d.propietarioApellidos.trim()));
  exigir('inquilinoNombres', nombres(inqJuridico, d.inquilinoNombres));
  exigir('inquilinoApellidos', inqJuridico || NOMBRE.test(d.inquilinoApellidos.trim()));
  exigir('direccion', lleno(d.direccion));
  exigir('ciudad', lleno(d.ciudad));
  exigir('uso', d.uso === 'VIVIENDA' || d.uso === 'COMERCIO');
  const canon = Number(d.canon);
  exigir('canon', Number.isFinite(canon) && canon > 0 && canon <= 100_000_000);
  exigir('administracion', !lleno(d.administracion) || (Number(d.administracion) >= 0 && Number(d.administracion) <= 100_000_000));
  // El backend acepta contratos que empiezan hasta 90 días atrás y hasta un año adelante.
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(d.fechaInicio) ? new Date(`${d.fechaInicio}T12:00:00`) : null;
  const dias = inicio ? (inicio.getTime() - hoy.getTime()) / 86_400_000 : NaN;
  exigir('fechaInicio', inicio !== null && dias >= -90 && dias <= 365);
  const meses = Number(d.duracionMeses);
  exigir('duracionMeses', Number.isInteger(meses) && meses >= 1 && meses <= 60);
  const dia = Number(d.diaPago);
  exigir('diaPago', Number.isInteger(dia) && dia >= 1 && dia <= 31);
  exigir('formaPago', d.formaPago === 'transferencia' || d.formaPago === 'efectivo');
  if (d.formaPago === 'transferencia') {
    exigir('numeroCuenta', /^\d{5,30}$/.test(d.numeroCuenta.replace(/[\s-]/g, '')));
  }
  return faltan;
}

/** Extras de la solicitud que viajan con el contrato. */
export interface ExtrasContrato {
  readonly propietario: DocumentoParte;
  readonly inquilino: DocumentoParte;
  readonly tipoFirma?: string;
  readonly cotizacionReferencia?: string;
  readonly numeroEstudio?: string;
}

/**
 * Contrato que se registra al enviar la solicitud, con los datos ya confirmados. `null` si aún falta algo.
 * Función pura.
 */
export function solicitudDeContrato(
  d: DatosContratoFirmado,
  extras: ExtrasContrato,
  catalogos: CatalogosContrato,
): ContratoArrendamientoRequest | null {
  if (datosFaltantes(d, extras.propietario, extras.inquilino).length
    || !lleno(extras.propietario.numero) || !lleno(extras.inquilino.numero)) {
    return null;
  }
  const juridica = extras.propietario.tipo === 'NIT';
  const inqJuridico = extras.inquilino.tipo === 'NIT';
  const transferencia = d.formaPago === 'transferencia';
  return {
    arrendador: {
      nombres: d.propietarioNombres.trim(),
      apellidos: juridica ? '' : d.propietarioApellidos.trim(),
      tipoIdentificacion: extras.propietario.tipo,
      numeroIdentificacion: extras.propietario.numero.trim(),
      telefono: '',
      correo: '',
      direccionResidencia: '',
      ...(juridica ? { tipoPersona: 'JURIDICA' as const } : {}),
    },
    arrendatario: {
      nombres: d.inquilinoNombres.trim(),
      apellidos: inqJuridico ? '' : d.inquilinoApellidos.trim(),
      tipoIdentificacion: extras.inquilino.tipo,
      numeroIdentificacion: extras.inquilino.numero.trim(),
      telefono: '',
      correo: '',
      // El arrendatario se notifica en el inmueble que arrienda.
      direccionNotificacion: d.direccion.trim(),
      ...(inqJuridico ? { tipoPersona: 'JURIDICA' as const } : {}),
    },
    inmueble: {
      tipoInmueble: d.tipoInmueble.trim(),
      uso: d.uso === 'COMERCIO' ? catalogos.usoComercio : catalogos.usoVivienda,
      direccionCompleta: d.direccion.trim(),
      ciudad: d.ciudad,
      matriculaInmobiliaria: d.matricula.trim(),
      ...(lleno(d.garaje) ? { garaje: d.garaje.trim() } : {}),
      ...(lleno(d.deposito) ? { deposito: d.deposito.trim() } : {}),
    },
    condiciones: {
      canonMensual: Number(d.canon),
      cuotaAdministracion: lleno(d.administracion) ? Number(d.administracion) : 0,
      // El backend acepta de 1 a 60 meses; el tipo del formulario de Contratos solo lista 12, 24 y 36.
      duracionMeses: Number(d.duracionMeses) as DuracionContratoMeses,
      diaPagoMensual: Number(d.diaPago),
      fechaInicio: d.fechaInicio,
      reajusteAnual: 'IPC',
      serviciosIncluidos: [],
      incluyeDeudoresSolidarios: false,
      metodoPago: transferencia ? 'transferencia' : 'efectivo',
      ...(transferencia ? {
        tipoCuenta: lleno(d.tipoCuenta) ? d.tipoCuenta.trim() : 'ahorros',
        numeroCuenta: d.numeroCuenta.replace(/[\s-]/g, ''),
        ...(lleno(d.banco) ? { banco: d.banco.trim() } : {}),
      } : {}),
    },
    ...(lleno(extras.cotizacionReferencia) ? { cotizacionReferencia: extras.cotizacionReferencia } : {}),
    adicionales: {
      leasing: false,
      arrendadorEsTitular: true,
      tieneClausulas: false,
      ...(lleno(extras.tipoFirma) ? { tipoFirma: extras.tipoFirma } : {}),
      ...(lleno(extras.numeroEstudio) ? { numeroSolicitud: extras.numeroEstudio } : {}),
    },
  };
}
