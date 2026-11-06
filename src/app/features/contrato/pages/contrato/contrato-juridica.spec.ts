import {
  coarrendadorVacio,
  novedadTitularesCtl,
  parsearTitulares,
  pendientesArrendador,
  pendientesCoarrendadores,
  separarNombre,
} from './contrato-presentacion';

const BASE = {
  nombres: 'INVERSIONES ALFA S.A.S.',
  apellidos: '',
  tipoIdentificacion: 'NIT' as const,
  numeroIdentificacion: '900123456',
  telefono: '3001112222',
  correo: 'alfa@ejemplo.com',
  direccionResidencia: 'CL 1 2 3',
};

describe('contrato: persona jurídica, apoderado y otros propietarios', () => {
  it('la persona jurídica no necesita apellidos ni ciudad de expedición, pero sí representante legal', () => {
    const sinRep = pendientesArrendador({ ...BASE, tipoPersona: 'JURIDICA' });
    expect(sinRep).toEqual(['Representante legal (nombre y documento)']);
    const conRep = pendientesArrendador({
      ...BASE,
      tipoPersona: 'JURIDICA',
      representanteLegal: { nombre: 'Carlos Rojas', tipoIdentificacion: 'CC', numeroIdentificacion: '79123456' },
    });
    expect(conRep).toEqual([]);
  });

  it('un apoderado incompleto se reclama', () => {
    const p = pendientesArrendador({
      ...BASE, tipoPersona: 'JURIDICA',
      representanteLegal: { nombre: 'Carlos Rojas', tipoIdentificacion: 'CC', numeroIdentificacion: '79123456' },
      apoderado: { nombre: '', tipoIdentificacion: 'CC', numeroIdentificacion: '' },
    });
    expect(p).toEqual(['Apoderado (nombre y documento)']);
  });

  it('la persona natural sigue pidiendo apellidos y ciudad de expedición', () => {
    const p = pendientesArrendador({ ...BASE, tipoPersona: 'NATURAL', tipoIdentificacion: 'CC' });
    expect(p).toEqual(expect.arrayContaining(['Apellidos', 'Ciudad de expedición del documento']));
  });

  it('un propietario adicional incompleto indica cuál es, sin pedirle teléfono ni correo', () => {
    const p = pendientesCoarrendadores([{ ...coarrendadorVacio(), nombres: 'Luis' }]);
    expect(p.every((f) => f.startsWith('Propietario 2: '))).toBe(true);
    expect(p.join()).not.toMatch(/Teléfono|Correo/);
  });

  it('lee los titulares del CTL con su documento y descarta los que no lo traen claro', () => {
    const t = parsearTitulares('ANA MARIA GOMEZ RUIZ - CC 52804998 | INVERSIONES ALFA SAS - NIT 900123456 | SIN DOCUMENTO');
    expect(t).toEqual([
      { nombre: 'ANA MARIA GOMEZ RUIZ', tipoIdentificacion: 'CC', numeroIdentificacion: '52804998' },
      { nombre: 'INVERSIONES ALFA SAS', tipoIdentificacion: 'NIT', numeroIdentificacion: '900123456' },
    ]);
    expect(parsearTitulares(null)).toEqual([]);
  });

  it('radicación: avisa si el propietario no figura entre los titulares del CTL y no alerta sin con qué comparar', () => {
    const ctl = 'ANA MARIA GOMEZ RUIZ - CC 52804998 | INVERSIONES ALFA SAS - NIT 900123456';
    expect(novedadTitularesCtl(ctl, '52804998')).toBeNull();
    expect(novedadTitularesCtl(ctl, '9001234567')).toBeNull(); // NIT con dígito de verificación
    expect(novedadTitularesCtl(ctl, '11111111')).toContain('no figura entre los titulares');
    expect(novedadTitularesCtl(null, '11111111')).toBeNull();
    expect(novedadTitularesCtl(ctl, '')).toBeNull();
  });

  it('CTL real 50N-20478477 (lectura de gemini-2.5-flash): titulares vigentes y cruce con el propietario', () => {
    // Texto tal como lo devolvió el lector; la constructora y el banco de la hipoteca no son titulares.
    const titulares = 'HERNANDEZ VILLAMIL CLAUDIA INES - CC 51713314 | TELLEZ GOMEZ GERMAN EDUARDO - CC 19460051';
    expect(parsearTitulares(titulares).map((t) => t.numeroIdentificacion)).toEqual(['51713314', '19460051']);
    expect(novedadTitularesCtl(titulares, '51713314')).toBeNull();
    expect(novedadTitularesCtl(titulares, '19460051')).toBeNull();
    expect(novedadTitularesCtl(titulares, '80123456')).toContain('HERNANDEZ VILLAMIL CLAUDIA INES');
  });

  it('separa nombres y apellidos de un nombre completo', () => {
    expect(separarNombre('ANA MARIA GOMEZ RUIZ')).toEqual({ nombres: 'ANA MARIA', apellidos: 'GOMEZ RUIZ' });
    expect(separarNombre('LUIS MORA')).toEqual({ nombres: 'LUIS', apellidos: 'MORA' });
  });
});
