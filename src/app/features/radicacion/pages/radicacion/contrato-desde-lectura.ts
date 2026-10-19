import type { ContratoArrendamientoRequest, LecturaContratoResponse } from '../../../../core/models/contrato.model';
import type { TipoDocumentoIdentidad } from '../../../../core/models/radicacion.model';

/** Catálogos con los que se valida la lectura (los mismos que acepta el backend). */
export interface CatalogosContrato {
  readonly ciudades: readonly string[];
  /** Descripción del uso de vivienda y de comercio en `uso_inmueble`. */
  readonly usoVivienda: string;
  readonly usoComercio: string;
}

const sinTildes = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const lleno = (v: string | undefined | null): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Arma el contrato a partir de la lectura de un contrato firmado cargado en la radicación. Devuelve `null` si
 * falta algo que el backend exige (partes, dirección, ciudad con cobertura, canon, fecha o cuenta del canon):
 * en ese caso el broker lo completa en Contratos con la lectura precargada. Función pura.
 */
export function contratoDesdeLectura(
  lectura: LecturaContratoResponse,
  catalogos: CatalogosContrato,
  tipoFirma = '',
): ContratoArrendamientoRequest | null {
  const { arrendador: arr, arrendatario: ate, inmueble: inm, condiciones: con } = lectura;
  const parteCompleta = (p: typeof arr) =>
    lleno(p.nombres) && lleno(p.apellidos) && lleno(p.tipoIdentificacion) && lleno(p.numeroIdentificacion);
  const ciudad = catalogos.ciudades.find((c) => lleno(inm.ciudad) && sinTildes(c) === sinTildes(inm.ciudad));
  const dia = Number(/^\d{4}-\d{2}-(\d{2})$/.exec(con.fechaInicio ?? '')?.[1]);
  if (!parteCompleta(arr) || !parteCompleta(ate) || !lleno(inm.direccionCompleta) || !ciudad
    || !con.canonMensual || con.canonMensual <= 0 || !dia || !lleno(con.numeroCuenta)) {
    return null;
  }
  const deudor = lectura.deudorSolidario;
  const conDeudor = !!deudor && parteCompleta(deudor);
  const comercio = /comerc|local|oficina|bodega/i.test(`${inm.uso ?? ''} ${inm.tipoInmueble ?? ''}`);
  const parte = (p: typeof arr) => ({
    nombres: p.nombres!.trim(),
    apellidos: p.apellidos!.trim(),
    tipoIdentificacion: p.tipoIdentificacion as TipoDocumentoIdentidad,
    numeroIdentificacion: p.numeroIdentificacion!.trim(),
    telefono: p.telefono ?? '',
    correo: p.correo ?? '',
  });
  return {
    arrendador: { ...parte(arr), direccionResidencia: arr.direccion ?? '', direccionNotificacion: arr.direccion ?? '' },
    // El arrendatario se notifica en el inmueble que arrienda.
    arrendatario: { ...parte(ate), direccionNotificacion: inm.direccionCompleta!.trim() },
    inmueble: {
      tipoInmueble: inm.tipoInmueble ?? '',
      uso: comercio ? catalogos.usoComercio : catalogos.usoVivienda,
      direccionCompleta: inm.direccionCompleta!.trim(),
      ciudad,
      matriculaInmobiliaria: inm.matriculaInmobiliaria ?? '',
    },
    condiciones: {
      canonMensual: con.canonMensual,
      cuotaAdministracion: con.cuotaAdministracion ?? 0,
      duracionMeses: (con.duracionMeses && con.duracionMeses > 0 ? con.duracionMeses : 12) as 12,
      diaPagoMensual: dia,
      fechaInicio: con.fechaInicio!,
      reajusteAnual: 'IPC',
      serviciosIncluidos: [],
      incluyeDeudoresSolidarios: conDeudor,
      metodoPago: 'transferencia',
      tipoCuenta: con.tipoCuenta ?? 'ahorros',
      numeroCuenta: con.numeroCuenta!.trim(),
      ...(lleno(con.banco) ? { banco: con.banco.trim() } : {}),
    },
    ...(conDeudor ? {
      deudores: [{
        ...parte(deudor), ciudadExpedicion: '', direccionNotificacion: deudor.direccion ?? '',
      }],
    } : {}),
    adicionales: { leasing: false, arrendadorEsTitular: true, tieneClausulas: false, ...(tipoFirma ? { tipoFirma } : {}) },
  };
}
