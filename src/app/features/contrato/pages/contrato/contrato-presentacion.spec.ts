import {
  campoDiligenciado,
  esCorreoValido,
  esIdentificacionValida,
  esPasoArrendadorValido,
  esPasoArrendatarioValido,
  esPasoCondicionesValido,
  esPasoInmuebleValido,
  esPasoValido,
  esTelefonoValido,
  puedeAvanzar,
  puedeGenerar,
  puedeRetroceder,
  type EstadoContrato,
  ULTIMO_PASO,
} from './contrato-presentacion';
import type {
  CondicionesEconomicas,
  DatosArrendador,
  DatosArrendatario,
  DatosInmueble,
} from '../../../../core/models/contrato.model';

/**
 * Pruebas unitarias de la lógica pura del Generador_Contrato (Req 30.2–30.8).
 * Ejemplos y casos borde que complementan la prueba de propiedad
 * (Property 22, tarea 11.2).
 */
describe('contrato-presentacion (lógica pura del Generador_Contrato)', () => {
  const arrendadorOk: DatosArrendador = {
    nombres: 'Ana María',
    apellidos: 'Gómez',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1023456',
    telefono: '3001234567',
    correo: 'ana@ejemplo.com',
    direccionResidencia: 'Calle 1 # 2-3',
  };

  const arrendatarioOk: DatosArrendatario = {
    nombres: 'Carlos',
    apellidos: 'Pérez',
    tipoIdentificacion: 'CE',
    numeroIdentificacion: '987654',
    telefono: '3109876',
    correo: 'carlos@ejemplo.com',
    ocupacion: 'Ingeniero',
  };

  const inmuebleOk: DatosInmueble = {
    tipoInmueble: 'Apartamento',
    uso: 'Vivienda',
    direccionCompleta: 'Carrera 10 # 20-30',
    ciudad: 'Bogotá',
    matriculaInmobiliaria: '050-123456',
    estrato: 3,
    areaMetrosCuadrados: 65,
  };

  const condicionesOk: CondicionesEconomicas = {
    canonMensual: 1500000,
    cuotaAdministracion: 0,
    duracionMeses: 12,
    diaPagoMensual: 5,
    fechaInicio: '2026-01-01',
    reajusteAnual: 'IPC',
    serviciosIncluidos: [],
    incluyeDeudoresSolidarios: false,
    metodoPago: 'transferencia',
    tipoCuenta: 'ahorros',
    numeroCuenta: '123456789',
  };

  const estadoCompleto: EstadoContrato = {
    arrendador: arrendadorOk,
    arrendatario: arrendatarioOk,
    inmueble: inmuebleOk,
    condiciones: condicionesOk,
  };

  describe('validadores de campo (Req 30.2, 30.3)', () => {
    it('campoDiligenciado rechaza vacío/espacios/undefined y acepta texto', () => {
      // Given / When / Then
      expect(campoDiligenciado('')).toBe(false);
      expect(campoDiligenciado('   ')).toBe(false);
      expect(campoDiligenciado(undefined)).toBe(false);
      expect(campoDiligenciado('Bogotá')).toBe(true);
    });

    it('esCorreoValido acepta formato de correo y rechaza el resto', () => {
      expect(esCorreoValido('a@b.co')).toBe(true);
      expect(esCorreoValido('sin-arroba')).toBe(false);
      expect(esCorreoValido('a@b')).toBe(false);
      expect(esCorreoValido('')).toBe(false);
    });

    it('esTelefonoValido exige entre 7 y 10 dígitos', () => {
      expect(esTelefonoValido('3001234')).toBe(true);
      expect(esTelefonoValido('3001234567')).toBe(true);
      expect(esTelefonoValido('300123')).toBe(false);
      expect(esTelefonoValido('30012345678')).toBe(false);
      expect(esTelefonoValido('300abc4')).toBe(false);
    });

    it('esIdentificacionValida exige entre 6 y 12 dígitos', () => {
      expect(esIdentificacionValida('123456')).toBe(true);
      expect(esIdentificacionValida('123456789012')).toBe(true);
      expect(esIdentificacionValida('12345')).toBe(false);
      expect(esIdentificacionValida('1234567890123')).toBe(false);
    });
  });

  describe('validez por paso (Req 30.6)', () => {
    it('paso arrendador válido con datos completos e inválido si falta un campo', () => {
      expect(esPasoArrendadorValido(arrendadorOk)).toBe(true);
      expect(esPasoArrendadorValido({ ...arrendadorOk, correo: 'malo' })).toBe(false);
      expect(esPasoArrendadorValido({ ...arrendadorOk, direccionResidencia: '' })).toBe(
        false,
      );
    });

    it('paso arrendatario ya no pide ocupación (operación) pero sí el correo', () => {
      expect(esPasoArrendatarioValido(arrendatarioOk)).toBe(true);
      expect(esPasoArrendatarioValido({ ...arrendatarioOk, ocupacion: '  ' })).toBe(true);
      expect(esPasoArrendatarioValido({ ...arrendatarioOk, correo: 'no-es-correo' })).toBe(false);
    });

    it('paso inmueble no pide estrato ni área, y con leasing exige el permiso de subarriendo', () => {
      expect(esPasoInmuebleValido({ ...inmuebleOk, estrato: undefined, areaMetrosCuadrados: undefined })).toBe(true);
      expect(esPasoInmuebleValido({ ...inmuebleOk, leasing: true })).toBe(false);
      expect(esPasoInmuebleValido({ ...inmuebleOk, leasing: true, permisoSubarriendo: true })).toBe(true);
    });

    it('paso condiciones exige método de pago y cuenta válida salvo efectivo', () => {
      expect(esPasoCondicionesValido({ ...condicionesOk, metodoPago: undefined as never })).toBe(false);
      expect(esPasoCondicionesValido({ ...condicionesOk, numeroCuenta: '' })).toBe(false);
      expect(esPasoCondicionesValido({ ...condicionesOk, numeroCuenta: '12-34' })).toBe(false);
      expect(esPasoCondicionesValido({ ...condicionesOk, numeroCuenta: '1'.repeat(35) })).toBe(false);
      expect(esPasoCondicionesValido({ ...condicionesOk, numeroCuenta: '1'.repeat(34) })).toBe(true);
      expect(
        esPasoCondicionesValido({ ...condicionesOk, metodoPago: 'efectivo', numeroCuenta: undefined }),
      ).toBe(true);
    });

    it('paso condiciones exige canon positivo, administración ≥ 0 y duración válida', () => {
      expect(esPasoCondicionesValido(condicionesOk)).toBe(true);
      expect(esPasoCondicionesValido({ ...condicionesOk, canonMensual: 0 })).toBe(false);
      expect(esPasoCondicionesValido({ ...condicionesOk, cuotaAdministracion: -1 })).toBe(
        false,
      );
      expect(
        esPasoCondicionesValido({
          ...condicionesOk,
          duracionMeses: 6 as unknown as CondicionesEconomicas['duracionMeses'],
        }),
      ).toBe(false);
      expect(esPasoCondicionesValido({ ...condicionesOk, diaPagoMensual: 0 })).toBe(false);
      expect(esPasoCondicionesValido({ ...condicionesOk, diaPagoMensual: 32 })).toBe(false);
    });

    it('esPasoValido devuelve false para índices fuera de rango', () => {
      expect(esPasoValido(-1, estadoCompleto)).toBe(false);
      expect(esPasoValido(4, estadoCompleto)).toBe(false);
    });
  });

  describe('gating de avance (Property 22, Req 30.6)', () => {
    it('permite avanzar cuando el paso actual es válido y no es el último', () => {
      expect(puedeAvanzar(0, estadoCompleto)).toBe(true);
      expect(puedeAvanzar(1, estadoCompleto)).toBe(true);
      expect(puedeAvanzar(2, estadoCompleto)).toBe(true);
    });

    it('impide avanzar cuando el paso actual es inválido', () => {
      const estadoMalArrendador: EstadoContrato = {
        ...estadoCompleto,
        arrendador: { ...arrendadorOk, correo: '' },
      };
      expect(puedeAvanzar(0, estadoMalArrendador)).toBe(false);
    });

    it('nunca permite avanzar desde el último paso', () => {
      expect(puedeAvanzar(ULTIMO_PASO, estadoCompleto)).toBe(false);
    });

    it('puedeRetroceder es falso solo en el primer paso', () => {
      expect(puedeRetroceder(0)).toBe(false);
      expect(puedeRetroceder(1)).toBe(true);
      expect(puedeRetroceder(3)).toBe(true);
    });
  });

  describe('habilitación de generación (Req 30.7)', () => {
    it('permite generar solo cuando todos los pasos son válidos', () => {
      expect(puedeGenerar(estadoCompleto)).toBe(true);
    });

    it('impide generar si algún paso es inválido', () => {
      const incompleto: EstadoContrato = {
        ...estadoCompleto,
        condiciones: { ...condicionesOk, canonMensual: 0 },
      };
      expect(puedeGenerar(incompleto)).toBe(false);
    });
  });
});
