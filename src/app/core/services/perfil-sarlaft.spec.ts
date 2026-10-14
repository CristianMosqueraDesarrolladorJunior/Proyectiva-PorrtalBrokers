import { estadoSarlaftPerfil } from './perfil.service';

describe('estadoSarlaftPerfil', () => {
  it('traduce lo que decide el backend sin confundir Cumplimiento con desactualizado', () => {
    expect(estadoSarlaftPerfil('ACTUALIZADO')).toBe('vigente');
    expect(estadoSarlaftPerfil('puede_continuar')).toBe('vigente');
    expect(estadoSarlaftPerfil('DESACTUALIZADO')).toBe('vencido');
    expect(estadoSarlaftPerfil('requiere_actualizacion')).toBe('vencido');
    expect(estadoSarlaftPerfil('CONSULTABLE')).toBe('en_cumplimiento');
    expect(estadoSarlaftPerfil(null)).toBe('sin_consultar');
  });
});
