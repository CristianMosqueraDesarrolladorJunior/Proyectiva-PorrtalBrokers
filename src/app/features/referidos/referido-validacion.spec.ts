import { campoDiligenciado, validarReferido } from './referido-validacion';

describe('referido-validacion (lógica pura, Req 15.2)', () => {
  describe('campoDiligenciado', () => {
    it('rechaza undefined, vacío y solo espacios', () => {
      // Given / When / Then
      expect(campoDiligenciado(undefined)).toBe(false);
      expect(campoDiligenciado('')).toBe(false);
      expect(campoDiligenciado('   ')).toBe(false);
    });

    it('acepta texto significativo', () => {
      expect(campoDiligenciado('Juan')).toBe(true);
      expect(campoDiligenciado('  x  ')).toBe(true);
    });
  });

  describe('validarReferido', () => {
    const base = {
      nombre: 'Juan Pérez',
      cedula: '123456',
      celular: '3000000000',
      producto: 'Arrendamiento',
    };

    it('es válido cuando nombre, cédula, celular y producto están diligenciados', () => {
      // Given
      const referido = { ...base };
      // When
      const resultado = validarReferido(referido);
      // Then
      expect(resultado.formularioValido).toBe(true);
    });

    it('es inválido si falta el nombre', () => {
      const resultado = validarReferido({ ...base, nombre: '' });
      expect(resultado.nombreValido).toBe(false);
      expect(resultado.formularioValido).toBe(false);
    });

    it('es inválido si falta la cédula', () => {
      const resultado = validarReferido({ ...base, cedula: '  ' });
      expect(resultado.cedulaValida).toBe(false);
      expect(resultado.formularioValido).toBe(false);
    });

    it('es inválido si falta el celular', () => {
      const resultado = validarReferido({ ...base, celular: '' });
      expect(resultado.celularValido).toBe(false);
      expect(resultado.formularioValido).toBe(false);
    });

    it('acepta el celular con espacios, guiones o +57 (se envía solo con dígitos)', () => {
      expect(validarReferido({ ...base, celular: '300 000 0000' }).celularValido).toBe(true);
      expect(validarReferido({ ...base, celular: '+57 300-000-0000' }).celularValido).toBe(true);
    });

    it('rechaza lo que el backend rechazaría: cédula fuera de 6–10 dígitos y celular corto', () => {
      expect(validarReferido({ ...base, cedula: '12345' }).cedulaValida).toBe(false);
      expect(validarReferido({ ...base, cedula: '12345678901' }).cedulaValida).toBe(false);
      expect(validarReferido({ ...base, celular: '300 12' }).celularValido).toBe(false);
    });

    it('es inválido si falta el producto', () => {
      const resultado = validarReferido({ ...base, producto: '' });
      expect(resultado.productoValido).toBe(false);
      expect(resultado.formularioValido).toBe(false);
    });
  });
});
