import fc from 'fast-check';
import { mensajeErrorIntegracion } from './errores-integracion';

describe('mensajeErrorIntegracion', () => {
  const err = (status: number, fields: string[] = []) => ({ status, error: { fields } });

  it('traduce los casos de borde conocidos de la radicación', () => {
    expect(mensajeErrorIntegracion(err(400, ['contratoReferencia']))).toContain('Genera el contrato');
    expect(mensajeErrorIntegracion(err(422, ['contratoRadicado']))).toContain('ya fue radicado');
    expect(mensajeErrorIntegracion(err(422, ['ciudadInmueble']))).toContain('no está soportada');
    expect(mensajeErrorIntegracion(err(422, ['autorizacionDatos']))).toContain('autorización');
  });

  it('nunca filtra detalle técnico ni datos personales del error', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 599 }), fc.array(fc.string()), fc.string(), (status, fields, detalle) => {
        const sensible = `TRAZA ${detalle} cedula 1032456789 correo x@y.com`;
        const mensaje = mensajeErrorIntegracion({ status, message: sensible, error: { fields, detail: sensible } });
        expect(mensaje).not.toContain('1032456789');
        expect(mensaje).not.toContain('x@y.com');
        expect(mensaje).not.toContain('TRAZA');
      }),
      { numRuns: 100 },
    );
  });
});
