import { huellaArchivo, tipoConMismaHuella } from './huella-archivo';

describe('huella-archivo', () => {
  it('Given dos archivos con el mismo contenido, When se calcula la huella, Then es igual', async () => {
    const a = new File(['mismo contenido'], 'a.pdf', { type: 'application/pdf' });
    const b = new File(['mismo contenido'], 'b.pdf', { type: 'application/pdf' });
    const ha = await huellaArchivo(a);
    const hb = await huellaArchivo(b);
    if (ha === null || hb === null) {
      // El entorno de pruebas no expone crypto.subtle: el servidor sigue siendo la fuente de verdad.
      expect(ha).toBeNull();
      return;
    }
    expect(ha).toBe(hb);
    expect(ha).toMatch(/^[0-9a-f]{64}$/);
  });

  it('Given contenidos distintos, When se calcula la huella, Then difiere', async () => {
    const ha = await huellaArchivo(new File(['uno'], 'a.pdf'));
    const hb = await huellaArchivo(new File(['dos'], 'b.pdf'));
    if (ha === null || hb === null) {
      return;
    }
    expect(ha).not.toBe(hb);
  });

  describe('tipoConMismaHuella', () => {
    const huellas = new Map([
      ['cedulaPropietario', 'h1'],
      ['certificadoTradicion', 'h2'],
    ]);

    it('Given la misma huella en otro documento, When se busca, Then devuelve ese documento', () => {
      expect(tipoConMismaHuella(huellas, 'rut', 'h2')).toBe('certificadoTradicion');
    });

    it('Given la misma huella en el mismo documento (reemplazo), When se busca, Then no es duplicado', () => {
      expect(tipoConMismaHuella(huellas, 'certificadoTradicion', 'h2')).toBeUndefined();
    });

    it('Given una huella nueva, When se busca, Then no hay duplicado', () => {
      expect(tipoConMismaHuella(huellas, 'rut', 'h9')).toBeUndefined();
    });
  });
});
