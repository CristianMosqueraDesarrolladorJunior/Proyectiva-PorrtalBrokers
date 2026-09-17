import { campoDiligenciado, validarPaso1 } from './nuevo-negocio-validacion';

describe('nuevo-negocio-validacion (lógica pura, Req 31.3)', () => {
  describe('campoDiligenciado', () => {
    it('rechaza undefined, vacío y solo espacios', () => {
      // Given / When / Then
      expect(campoDiligenciado(undefined)).toBe(false);
      expect(campoDiligenciado('')).toBe(false);
      expect(campoDiligenciado('   ')).toBe(false);
    });

    it('acepta texto significativo', () => {
      expect(campoDiligenciado('Inmobiliaria S.A.S.')).toBe(true);
      expect(campoDiligenciado('  x  ')).toBe(true);
    });
  });

  describe('validarPaso1', () => {
    const base = {
      nombreORazonSocial: 'Inmobiliaria El Libertador S.A.S.',
      identificacion: '900123456',
      correo: 'contacto@ejemplo.com',
      telefono: '3000000000',
      direccion: 'Calle 1 # 2-3',
    };

    it('es válido cuando nombre, identificación, correo y teléfono están diligenciados', () => {
      // Given
      const datos = { ...base };
      // When
      const resultado = validarPaso1(datos);
      // Then
      expect(resultado.paso1Valido).toBe(true);
    });

    it('la dirección es opcional y no afecta la validez', () => {
      // Given
      const { direccion: _omitida, ...sinDireccion } = base;
      // When
      const resultado = validarPaso1(sinDireccion);
      // Then
      expect(resultado.paso1Valido).toBe(true);
    });

    it('es inválido si falta el nombre o razón social', () => {
      const resultado = validarPaso1({ ...base, nombreORazonSocial: '' });
      expect(resultado.nombreValido).toBe(false);
      expect(resultado.paso1Valido).toBe(false);
    });

    it('es inválido si falta la identificación', () => {
      const resultado = validarPaso1({ ...base, identificacion: '   ' });
      expect(resultado.identificacionValida).toBe(false);
      expect(resultado.paso1Valido).toBe(false);
    });

    it('es inválido si falta el correo', () => {
      const resultado = validarPaso1({ ...base, correo: '' });
      expect(resultado.correoValido).toBe(false);
      expect(resultado.paso1Valido).toBe(false);
    });

    it('es inválido si falta el teléfono', () => {
      const resultado = validarPaso1({ ...base, telefono: '' });
      expect(resultado.telefonoValido).toBe(false);
      expect(resultado.paso1Valido).toBe(false);
    });

    it('es inválido con un estado inicial vacío', () => {
      const resultado = validarPaso1({});
      expect(resultado.paso1Valido).toBe(false);
    });
  });
});
