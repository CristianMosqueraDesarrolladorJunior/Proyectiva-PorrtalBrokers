import type { AccionRenovacion } from './poliza.model';
/**
 * Modelos de la consola del área (`/api/v1/admin/consola/*`). Datos completos, sin máscara: solo los
 * consumen roles internos y el servidor limita la cartera del comercial. Toda fila trae `creado` y
 * `ultimoMovimiento` (ISO-8601).
 */

export interface BrokerConsola {
  readonly id: string;
  readonly nombre: string;
  readonly documento: string | null;
  readonly correo: string | null;
  readonly celular: string | null;
  readonly tipo: string;
  readonly comercialCodigo: string | null;
  readonly comercialNombre: string | null;
  readonly porcentajeComision: number;
  readonly negocios: number;
  readonly polizas: number;
  readonly primas: number;
  readonly comisionCobrada: number;
  readonly comisionPagada: number;
  readonly creado: string;
  readonly ultimoMovimiento: string | null;
}

export interface ProspectoConsola {
  readonly id: string;
  readonly nombre: string;
  readonly documento: string | null;
  readonly correo: string | null;
  readonly celular: string | null;
  readonly comercialCodigo: string | null;
  readonly comercialNombre: string | null;
  /** SIN_SOLICITUD · RADICADA · EN_REVISION · APROBADA · RECHAZADA */
  readonly estadoLegalizacion: string;
  readonly documentosCargados: number;
  readonly sarlaftEstado: string | null;
  readonly sarlaftFecha: string | null;
  readonly estudios: number;
  readonly negocios: number;
  readonly primas: number;
  readonly comisionEnCurso: number;
  readonly creado: string;
  readonly ultimoMovimiento: string | null;
}

export interface DocumentoExpediente {
  readonly id: string;
  readonly tipo: string;
  readonly nombre: string | null;
  readonly tipoMime: string | null;
  readonly tamano: number;
  readonly estado: string | null;
  readonly fechaCarga: string | null;
  readonly archivoId: string;
}

export interface Movimiento {
  readonly fecha: string;
  readonly tipo: string;
  readonly descripcion: string;
  readonly broker: string | null;
  readonly referencia: string | null;
}

export interface ExpedienteProspecto {
  readonly prospecto: ProspectoConsola;
  readonly documentos: readonly DocumentoExpediente[];
  /** Lo que impide aprobar (vacío = se puede aprobar). */
  readonly faltantes: readonly string[];
  readonly actividad: readonly Movimiento[];
}

export interface ComercialConsola {
  readonly codigo: string;
  readonly nombre: string;
  readonly documento: string | null;
  readonly correo: string | null;
  readonly telefono: string | null;
  readonly activo: boolean;
  readonly usuario: string | null;
  readonly brokers: number;
  readonly prospectos: number;
  readonly negocios: number;
  readonly polizas: number;
  readonly primas: number;
  readonly comision: number;
  readonly creado: string;
  readonly ultimoMovimiento: string | null;
  /** De vacaciones: su cartera está prestada a los demás comerciales y vuelve a él al regresar. */
  readonly enVacaciones?: boolean;
  /** Cuentas suyas prestadas a otros comerciales mientras está de vacaciones. */
  readonly prestados?: number;
  /** Comisión del comercial (%) sobre las primas de su cartera; la fija el administrador. */
  readonly porcentajeComision?: number;
}

export interface NegocioConsola {
  readonly radicado: string;
  readonly propietario: string | null;
  readonly propietarioDocumento: string | null;
  readonly propietarioTelefono: string | null;
  readonly propietarioCorreo: string | null;
  readonly inquilino: string | null;
  readonly inquilinoDocumento: string | null;
  readonly inmueble: string | null;
  readonly ciudad: string | null;
  readonly broker: string;
  /** PROSPECTO · REGISTRADO */
  readonly brokerEstado: string;
  readonly comercial: string | null;
  readonly canon: number | null;
  readonly valorAsegurado: number | null;
  readonly prima: number | null;
  readonly estado: string;
  readonly numeroPoliza: string | null;
  readonly creado: string;
  readonly ultimoMovimiento: string | null;
}

export interface ParteNegocio {
  readonly nombre: string | null;
  readonly tipoDocumento: string | null;
  readonly documento: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly direccion: string | null;
}

export interface DetalleNegocioConsola {
  readonly negocio: NegocioConsola;
  readonly propietario: ParteNegocio;
  readonly inquilino: ParteNegocio;
  readonly tipoInmueble: string | null;
  readonly uso: string | null;
  readonly matricula: string | null;
  readonly estrato: number | null;
  readonly areaM2: number | null;
  readonly administracion: number | null;
  readonly duracionMeses: number | null;
  readonly diaPago: number | null;
  readonly inicioContrato: string | null;
  readonly cotizacion: string | null;
  readonly primaNeta: number | null;
  readonly iva: number | null;
  readonly comisionEstimada: number | null;
  readonly numeroEstudio: string | null;
  readonly estadoEstudio: string | null;
  readonly sarlaft: string | null;
  readonly historial: readonly Movimiento[];
}

export interface PolizaConsola {
  readonly numero: string;
  readonly radicado: string;
  readonly propietario: string | null;
  readonly broker: string;
  readonly brokerEstado: string;
  readonly comercial: string | null;
  readonly prima: number | null;
  readonly comision: number | null;
  readonly inicio: string | null;
  readonly vence: string | null;
  /** sin_cobrar · pendiente · pagada */
  readonly estadoPago: string;
  readonly cuentaCobroId: string | null;
  readonly cuentaCobroFecha: string | null;
  readonly creado: string;
  readonly ultimoMovimiento: string | null;
}

export interface TopBroker {
  readonly id: string;
  readonly nombre: string;
  readonly estado: string;
  readonly negocios: number;
  readonly polizas: number;
  readonly primas: number;
  readonly comision: number;
}

/** Última corrida de una sincronización Sheet → portal (bitácora). */
export interface SincronizacionConsola {
  readonly proceso: string;
  readonly ultimaCorrida: string;
  readonly filas: number;
  readonly detalle: string | null;
  readonly error: string | null;
  readonly ultimaExitosa: string | null;
}

/** Rendimiento y conversión de la cartera del comercial (o de todo, para el administrador). */
export interface RendimientoConsola {
  readonly prospectosActivos: number;
  readonly prospectosConvertidos: number;
  readonly cotizaciones: number;
  readonly radicaciones: number;
  readonly expedidas: number;
  readonly renovadas: number;
  readonly renovacionesCerradas: number;
  readonly polizasMes: number;
  readonly primasMes: number;
  readonly polizasTotal: number;
  readonly primasTotal: number;
  readonly comisionBrokers: number;
  /** Solo para un comercial: su porcentaje. */
  readonly porcentajeComercial: number | null;
  readonly comisionComercial: number;
}

export interface ResumenConsola {
  readonly ingresos: number;
  readonly ingresosBrokers: number;
  readonly ingresosProspectos: number;
  readonly comisionCobrada: number;
  readonly comisionPagada: number;
  readonly comisionPendiente: number;
  readonly negociosEnCurso: number;
  readonly polizasExpedidas: number;
  readonly brokersActivos: number;
  readonly prospectos: number;
  readonly topBrokers: readonly TopBroker[];
  readonly indicadores: IndicadoresConsola;
}

/** Indicadores de aseguradora: Warehouse de radicaciones, Warehouse de renovaciones y documentos. */
export interface IndicadoresConsola {
  readonly canonAsegurado: number;
  readonly valorAsegurado: number;
  readonly enEstudio: number;
  readonly enCorreccion: number;
  readonly aprobadasSinExpedir: number;
  readonly renovacionesTotal: number;
  readonly renovadas: number;
  readonly noRenovadas: number;
  readonly renovacionesEnGestion: number;
  readonly casosEspeciales: number;
  readonly desocupaciones: number;
  readonly legalizacionesEnRevision: number;
  readonly documentosCargados: number;
}

export interface RenovacionConsola {
  readonly id: string;
  readonly poliza: string;
  readonly asegurado: string | null;
  readonly aseguradoDocumento: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly direccion: string | null;
  readonly canon: number | null;
  readonly broker: string | null;
  readonly segmento: string | null;
  readonly gestor: string | null;
  readonly estadoWarehouse: string | null;
  /** pendiente · en_gestion · renovada · no_renovada · caso_especial */
  readonly estado: string;
  readonly casoEspecial: string | null;
  readonly inicioVigencia: string | null;
  readonly vence: string | null;
  readonly historial: string | null;
  readonly creado: string;
  readonly ultimoMovimiento: string | null;
  /** Qué se puede hacer hoy: la misma regla que ve el broker (RENOVAR, CORREGIR, INDUCCION, EN_PROCESO, CERRADA). */
  readonly accion?: AccionRenovacion;
  /** Renovada y con recaudo de la nueva vigencia en el libro de comisiones. */
  readonly pagada?: boolean;
}

export interface CredencialGenerada {
  readonly usuario: string;
  readonly credencial: string;
}

export interface PersonaRequest {
  readonly nombre: string;
  readonly documento: string;
  readonly correo: string;
  readonly telefono: string;
  /** Solo en el alta de un comercial: su comisión (%), 0 a 100. */
  readonly porcentajeComision?: number;
}

export interface ReferidoConsola {
  readonly radicado: string;
  readonly nombre: string;
  readonly cedula: string | null;
  readonly celular: string | null;
  readonly correo: string | null;
  readonly ramo: string | null;
  readonly comentario: string | null;
  /** EN_PROCESO · ACEPTADA · RECHAZADA */
  readonly estado: string | null;
  readonly broker: string;
  readonly comercial: string | null;
  readonly creado: string;
  readonly ultimoMovimiento: string | null;
  readonly historial: readonly Movimiento[];
}
