import {
  documentosObligatoriosFaltantes,
  esNumeroDocumentoPropietarioValido,
  esNumeroEstudioValido,
  etiquetasDocumentos,
  puedeEnviarRadicacion,
  validarDatosRadicacion,
} from './radicacion-presentacion';
import type { TipoDocumentoRadicacion } from '../../../../core/models/radicacion.model';

/**
 * Pruebas unitarias de la lógica pura de presentación de la Radicación
 * (Req 10.1, 10.2, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3). Ejemplos y casos
 * borde que complementan la prueba de propiedad (Property 10, tarea 10.2).
 */
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
        { tipoPersona: 'natural', firmaApoderado: false, sarlaftRequiereFormulario: false },
        sinCargar,
      );
      // Then
      expect([...faltantes]).toEqual(['cedulaPropietario', 'certificadoTradicion']);
    });

    it('Persona Jurídica exige 3 documentos base incluido el Formulario SARLAFT (Req 12.3)', () => {
      // When
      const faltantes = documentosObligatoriosFaltantes(
        { tipoPersona: 'juridica', firmaApoderado: false, sarlaftRequiereFormulario: false },
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
        { tipoPersona: 'natural', firmaApoderado: false, sarlaftRequiereFormulario: true },
        sinCargar,
      );
      // Then
      expect(faltantes).toContain('formularioSarlaft');
    });

    it('el caso apoderado agrega Poder y Cédula del apoderado (Req 10.2)', () => {
      // When
      const faltantes = documentosObligatoriosFaltantes(
        { tipoPersona: 'natural', firmaApoderado: true, sarlaftRequiereFormulario: false },
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
        { tipoPersona: 'juridica', firmaApoderado: true, sarlaftRequiereFormulario: false },
        sinCargar,
      );
      // Then
      expect(faltantes).not.toContain('contratoArrendamientoFirmado');
    });
  });

  describe('etiquetas legibles (Req 11.4)', () => {
    it('traduce los tipos de documento a etiquetas legibles en español', () => {
      // When
      const etiquetas = etiquetasDocumentos(['cedulaPropietario', 'formularioSarlaft']);
      // Then
      expect([...etiquetas]).toEqual(['Cédula del propietario', 'Formulario SARLAFT']);
    });
  });
});
