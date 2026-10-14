import { CATALOGOS_PRUEBA } from '../../../../../testing/catalogo-prueba';
import fc from 'fast-check';
import {
  claveConsultaSarlaft,
  construirPayloadRadicacion,
  documentosObligatoriosFaltantes,
  esNumeroDocumentoPropietarioValido,
  esNumeroEstudioValido,
  etiquetasDocumentos,
  pasoActivoRadicacion,
  permiteCargarDocumentos,
  puedeConsultarSarlaftRadicacion,
  puedeEnviarRadicacion,
  sujetoSarlaft,
  validarDatosRadicacion,
} from './radicacion-presentacion';
import type { TipoDocumentoRadicacion } from '../../../../core/models/radicacion.model';

/**
 * Pruebas unitarias de la lógica pura de presentación de la Radicación
 * (Req 10.1, 10.2, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3). Ejemplos y casos
 * borde que complementan la prueba de propiedad (Property 10, tarea 10.2).
 */
/** Documentos de radicación del catálogo (`documento_radicacion`, BD local). */
const DOCUMENTOS = CATALOGOS_PRUEBA.tablas['documento_radicacion'];
const ETIQUETAS = Object.fromEntries(DOCUMENTOS.map((d) => [d.codigo, d.descripcion]));
const VOCABULARIO_DOCUMENTOS_RADICACION = DOCUMENTOS.filter((d) => d['aplica'] !== 'OPCIONAL').map((d) => d.codigo);

describe('radicacion-presentacion', () => {
  describe('validación de datos base (Req 10.1)', () => {
    it('acepta un número de documento de solo dígitos entre 5 y 15', () => {
      // Given / When / Then
      expect(esNumeroDocumentoPropietarioValido('12345')).toBe(true);
      expect(esNumeroDocumentoPropietarioValido('123456789012345')).toBe(true);
    });

    it('rechaza documentos vacíos, con letras o fuera de rango', () => {
      // Given / When / Then
      expect(esNumeroDocumentoPropietarioValido('')).toBe(false);
      expect(esNumeroDocumentoPropietarioValido('1234')).toBe(false);
      expect(esNumeroDocumentoPropietarioValido('1234567890123456')).toBe(false);
      expect(esNumeroDocumentoPropietarioValido('12a45')).toBe(false);
    });

    it('exige un número de estudio no vacío tras recortar espacios', () => {
      // Given / When / Then
      expect(esNumeroEstudioValido('EST-001')).toBe(true);
      expect(esNumeroEstudioValido('   ')).toBe(false);
      expect(esNumeroEstudioValido('')).toBe(false);
    });

    it('marca los datos como válidos solo cuando ambos campos son válidos', () => {
      // When
      const ok = validarDatosRadicacion('900123', 'EST-9');
      const malDoc = validarDatosRadicacion('9x0', 'EST-9');
      // Then
      expect(ok.datosValidos).toBe(true);
      expect(malDoc.datosValidos).toBe(false);
    });
  });

  describe('documentos obligatorios y habilitación de envío (Req 11, 12)', () => {
    const sinCargar: readonly TipoDocumentoRadicacion[] = [];

    it('Persona Natural exige exactamente 2 documentos base', () => {
      // When
      const faltantes = documentosObligatoriosFaltantes(
        { tipoPersona: 'natural', firmaApoderado: false, sarlaftRequiereFormulario: false, documentos: DOCUMENTOS },
        sinCargar,
      );
      // Then
      expect([...faltantes]).toEqual(['cedulaPropietario', 'certificadoTradicion']);
    });

    it('Persona Jurídica exige 3 documentos base incluido el Formulario SARLAFT (Req 12.3)', () => {
      // When
      const faltantes = documentosObligatoriosFaltantes(
        { tipoPersona: 'juridica', firmaApoderado: false, sarlaftRequiereFormulario: false, documentos: DOCUMENTOS },
        sinCargar,
      );
      // Then
      expect([...faltantes]).toEqual([
        'certificadoExistencia',
        'cedulaRepresentanteLegal',
        'formularioSarlaft',
      ]);
    });

    it('Persona Natural con SARLAFT condicional agrega el Formulario SARLAFT (Req 12.1, 12.2)', () => {
      // When
      const faltantes = documentosObligatoriosFaltantes(
        { tipoPersona: 'natural', firmaApoderado: false, sarlaftRequiereFormulario: true, documentos: DOCUMENTOS },
        sinCargar,
      );
      // Then
      expect(faltantes).toContain('formularioSarlaft');
    });

    it('el caso apoderado agrega Poder y Cédula del apoderado (Req 10.2)', () => {
      // When
      const faltantes = documentosObligatoriosFaltantes(
        { tipoPersona: 'natural', firmaApoderado: true, sarlaftRequiereFormulario: false, documentos: DOCUMENTOS },
        sinCargar,
      );
      // Then
      expect(faltantes).toContain('poderApoderado');
      expect(faltantes).toContain('cedulaApoderado');
    });

    it('impide el envío mientras falten documentos obligatorios (Req 11.4)', () => {
      // Given: datos válidos pero sin documentos
      const entrada = {
        tipoPersona: 'natural' as const,
        firmaApoderado: false,
        sarlaftRequiereFormulario: false,
        documentos: DOCUMENTOS,
      };
      // When / Then
      expect(puedeEnviarRadicacion(entrada, sinCargar, true)).toBe(false);
    });

    it('habilita el envío cuando datos válidos y todos los obligatorios están cargados', () => {
      // Given
      const entrada = {
        tipoPersona: 'natural' as const,
        firmaApoderado: false,
        sarlaftRequiereFormulario: false,
        documentos: DOCUMENTOS,
      };
      const cargados: readonly TipoDocumentoRadicacion[] = [
        'cedulaPropietario',
        'certificadoTradicion',
      ];
      // When / Then
      expect(puedeEnviarRadicacion(entrada, cargados, true)).toBe(true);
    });

    it('impide el envío si los datos base no son válidos aunque estén los documentos', () => {
      // Given
      const entrada = {
        tipoPersona: 'natural' as const,
        firmaApoderado: false,
        sarlaftRequiereFormulario: false,
        documentos: DOCUMENTOS,
      };
      const cargados: readonly TipoDocumentoRadicacion[] = [
        'cedulaPropietario',
        'certificadoTradicion',
      ];
      // When / Then
      expect(puedeEnviarRadicacion(entrada, cargados, false)).toBe(false);
    });

    it('el contrato de arrendamiento firmado nunca aparece como pendiente (Req 11.3)', () => {
      // When
      const faltantes = documentosObligatoriosFaltantes(
        { tipoPersona: 'juridica', firmaApoderado: true, sarlaftRequiereFormulario: false, documentos: DOCUMENTOS },
        sinCargar,
      );
      // Then
      expect(faltantes).not.toContain('contratoArrendamientoFirmado');
    });
  });

  describe('etiquetas legibles (Req 11.4)', () => {
    it('traduce los tipos de documento a etiquetas legibles en español', () => {
      // When
      const etiquetas = etiquetasDocumentos(['cedulaPropietario', 'formularioSarlaft'], ETIQUETAS);
      // Then
      expect([...etiquetas]).toEqual(['Cédula del propietario', 'Formulario Conocimiento de Cliente (SARLAFT)']);
    });
  });

  describe('paso 4 SARLAFT (3 salidas)', () => {
    it('solo habilita documentos con SARLAFT actualizado', () => {
      expect(permiteCargarDocumentos('ACTUALIZADO')).toBe(true);
      expect(permiteCargarDocumentos('DESACTUALIZADO')).toBe(false);
      expect(permiteCargarDocumentos('CONSULTABLE')).toBe(false);
      expect(permiteCargarDocumentos(null)).toBe(false);
    });

    it('ubica el stepper según datos, SARLAFT y documentos', () => {
      expect(pasoActivoRadicacion(false, 'ACTUALIZADO', 0)).toBe(0);
      expect(pasoActivoRadicacion(true, null, 2)).toBe(2);
      expect(pasoActivoRadicacion(true, 'DESACTUALIZADO', 2)).toBe(2);
      expect(pasoActivoRadicacion(true, 'ACTUALIZADO', 2)).toBe(3);
      expect(pasoActivoRadicacion(true, 'ACTUALIZADO', 0)).toBe(4);
    });

    it('invalida la consulta si cambia firmante, documento o tipo de persona', () => {
      const base = claveConsultaSarlaft('propietario', 'CC', '1095836251', 'natural');
      expect(claveConsultaSarlaft('propietario', 'CC', ' 1095836251 ', 'natural')).toBe(base);
      expect(claveConsultaSarlaft('propietario', 'CC', '1095836252', 'natural')).not.toBe(base);
      expect(claveConsultaSarlaft('propietario', 'CE', '1095836251', 'natural')).not.toBe(base);
      expect(claveConsultaSarlaft('propietario', 'CC', '1095836251', 'juridica')).not.toBe(base);
      expect(claveConsultaSarlaft('apoderado', 'CC', '1095836251', 'natural')).not.toBe(base);
    });

    it('consulta al apoderado cuando es quien firma', () => {
      expect(sujetoSarlaft(true)).toBe('apoderado');
      expect(sujetoSarlaft(false)).toBe('propietario');
    });

    it('exige el documento del apoderado para consultar en el caso apoderado', () => {
      expect(puedeConsultarSarlaftRadicacion(true, false, '')).toBe(true);
      expect(puedeConsultarSarlaftRadicacion(true, true, '')).toBe(false);
      expect(puedeConsultarSarlaftRadicacion(true, true, '80123456')).toBe(true);
      expect(puedeConsultarSarlaftRadicacion(false, true, '80123456')).toBe(false);
    });
  });
});

describe('construirPayloadRadicacion (alineado 1:1 con el backend)', () => {
  const claves = [
    'autorizacionDatos', 'contratoReferencia', 'documentoInquilino', 'documentosCargados',
    'firmaApoderado', 'numeroEstudioArrendamiento', 'tipoDocumentoInquilino', 'tipoPersona',
  ];

  it('solo envía claves del DTO y documentos saneados de la allowlist, sin duplicados', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constantFrom(...VOCABULARIO_DOCUMENTOS_RADICACION), fc.string())),
        fc.option(fc.string(), { nil: null }),
        fc.boolean(),
        (documentos, contrato, autorizacion) => {
          const payload = construirPayloadRadicacion({
            contratoReferencia: contrato,
            numeroEstudioArrendamiento: ' 123 ',
            tipoDocumentoInquilino: 'CC',
            documentoInquilino: '7332800',
            documentosCargados: documentos,
            autorizacionDatos: autorizacion,
            tipoPersona: 'natural',
            firmaApoderado: false,
            vocabulario: VOCABULARIO_DOCUMENTOS_RADICACION,
          });
          expect(Object.keys(payload).sort()).toEqual(claves);
          expect(payload.autorizacionDatos).toBe(autorizacion);
          expect(payload.contratoReferencia).toBe((contrato ?? '').trim());
          expect(new Set(payload.documentosCargados).size).toBe(payload.documentosCargados.length);
          payload.documentosCargados.forEach((d) =>
            expect(VOCABULARIO_DOCUMENTOS_RADICACION).toContain(d),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('con apoderado envía su documento y su correo (columna "Correo Apoderado")', () => {
    const payload = construirPayloadRadicacion({
      contratoReferencia: 'CTR-1',
      numeroEstudioArrendamiento: '123',
      tipoDocumentoInquilino: 'CC',
      documentoInquilino: '7332800',
      documentosCargados: [],
      autorizacionDatos: true,
      tipoPersona: 'natural',
      firmaApoderado: true,
      documentoApoderado: ' 41503593 ',
      correoApoderado: ' apo@correo.com ',
      vocabulario: VOCABULARIO_DOCUMENTOS_RADICACION,
    });
    expect(payload.documentoApoderado).toBe('41503593');
    expect(payload.correoApoderado).toBe('apo@correo.com');
  });
});
