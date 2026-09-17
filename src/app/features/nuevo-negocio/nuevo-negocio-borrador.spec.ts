import {
  guardarBorrador,
  recuperarBorrador,
  type EstadoFormularioNN,
} from './nuevo-negocio-borrador';

describe('nuevo-negocio-borrador (lógica pura, Req 31.9)', () => {
  const estado: EstadoFormularioNN = {
    datosCliente: {
      nombreORazonSocial: 'Inmobiliaria El Libertador S.A.S.',
      identificacion: '900123456',
      correo: 'contacto@ejemplo.com',
      telefono: '3000000000',
      direccion: 'Calle 1 # 2-3',
    },
    parametros: {
      primaBase: 1000000,
      gastosAdministrativos: 50000,
      descuentoPct: 10,
      comisionPct: 8,
      frecuencia: 'mensual',
    },
    pasoActual: 1,
  };

  it('guardarBorrador conserva los datos ingresados y la marca de tiempo', () => {
    // Given / When
    const borrador = guardarBorrador(estado, '2026-01-01T00:00:00.000Z');
    // Then
    expect(borrador.datosCliente).toEqual(estado.datosCliente);
    expect(borrador.parametros).toEqual(estado.parametros);
    expect(borrador.pasoActual).toBe(1);
    expect(borrador.guardadoEn).toBe('2026-01-01T00:00:00.000Z');
  });

  it('el round-trip guardar → recuperar produce los mismos datos ingresados', () => {
    // Given
    const borrador = guardarBorrador(estado, '2026-01-01T00:00:00.000Z');
    // When
    const recuperado = recuperarBorrador(borrador);
    // Then
    expect(recuperado).toEqual(estado);
  });

  it('funciona con un estado parcial (borrador temprano)', () => {
    // Given
    const parcial: EstadoFormularioNN = {
      datosCliente: { nombreORazonSocial: 'Cliente parcial' },
      parametros: {},
      pasoActual: 0,
    };
    // When
    const recuperado = recuperarBorrador(
      guardarBorrador(parcial, '2026-02-02T10:00:00.000Z'),
    );
    // Then
    expect(recuperado).toEqual(parcial);
  });

  it('guardarBorrador no muta el estado de origen (sin efectos)', () => {
    // Given
    const original = JSON.parse(JSON.stringify(estado)) as EstadoFormularioNN;
    // When
    guardarBorrador(estado, '2026-01-01T00:00:00.000Z');
    // Then
    expect(estado).toEqual(original);
  });
});
