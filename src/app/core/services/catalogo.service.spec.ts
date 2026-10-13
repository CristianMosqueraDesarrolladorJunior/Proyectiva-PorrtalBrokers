import { TestBed } from '@angular/core/testing';

import { CATALOGOS_PRUEBA, proveerCatalogosPrueba } from '../../../testing/catalogo-prueba';
import { moduloBloqueado } from '../models/cuenta.model';
import { CatalogoService } from './catalogo.service';

describe('CatalogoService (catálogos de BD, sin listas en el front)', () => {
  let catalogo: CatalogoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [proveerCatalogosPrueba()] });
    catalogo = TestBed.inject(CatalogoService);
  });

  it('filtra códigos por bandera y arma etiquetas', () => {
    expect(catalogo.codigos('tipo_documento', 'apoderado')).toEqual(['CC', 'CE', 'PA']);
    expect(catalogo.codigos('tipo_caso_especial', 'para_broker')).toEqual(['OTRO_SI', 'CESION']);
    expect(catalogo.etiquetas('estado_poliza')['PROXIMA_A_RENOVAR']).toBe('Próxima a renovar');
    expect(catalogo.etiqueta('ciudad', 'NO_EXISTE')).toBe('NO_EXISTE');
  });

  it('expone parámetros numéricos y NaN si faltan', () => {
    expect(catalogo.parametro('IVA_CANON_COMERCIO')).toBe(0.19);
    expect(catalogo.parametro('NO_EXISTE')).toBeNaN();
  });

  it('combina etiqueta del catálogo con la variante de presentación', () => {
    const insignias = catalogo.insignias('estado_pago_comision', { pagada: 'success' }, 'info');
    expect(insignias['pagada']).toEqual({ etiqueta: 'Pagada al broker', variante: 'success' });
    expect(insignias['pendiente']?.variante).toBe('info');
  });

  it('bloquea al prospecto solo los módulos restringidos del catálogo', () => {
    const restringidas = catalogo.modulosRestringidos().map((m) => m.ruta);
    expect(restringidas).toContain('comisiones');
    expect(moduloBloqueado('PROSPECTO', 'comisiones', restringidas)).toBe(true);
    expect(moduloBloqueado('PROSPECTO', 'radicacion', restringidas)).toBe(false);
    expect(moduloBloqueado('REGISTRADO', 'comisiones', restringidas)).toBe(false);
    expect(CATALOGOS_PRUEBA.tablas['modulo_portal'].length).toBe(14);
  });
});
