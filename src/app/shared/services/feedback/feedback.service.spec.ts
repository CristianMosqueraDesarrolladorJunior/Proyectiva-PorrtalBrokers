import fc from 'fast-check';

import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let servicio: FeedbackService;

  beforeEach(() => {
    jest.useFakeTimers();
    servicio = new FeedbackService();
  });

  afterEach(() => jest.useRealTimers());

  it('cargando muestra la carga y cerrar(id) la oculta', () => {
    // Given / When
    const id = servicio.cargando({ mensaje: 'Enviando...' });
    // Then
    expect(servicio.cargaActiva()?.mensaje).toBe('Enviando...');
    servicio.cerrar(id);
    expect(servicio.cargaActiva()).toBeNull();
  });

  it('exito y error abren el diálogo con su variante y «Entendido» por defecto', () => {
    // When
    servicio.exito({ titulo: '¡Listo!', mensaje: 'Radicada.' });
    // Then
    expect(servicio.dialogoActivo()).toMatchObject({ variante: 'exito', acciones: { confirmar: 'Entendido' } });
    // When
    servicio.error({ titulo: 'Ups', mensaje: 'Falló.', acciones: { reintentar: 'Reintentar' } });
    // Then: el nuevo reemplaza al anterior
    expect(servicio.dialogoActivo()).toMatchObject({ variante: 'error', acciones: { reintentar: 'Reintentar' } });
  });

  it('resolver cierra el diálogo e invoca alResolver una sola vez', () => {
    // Given
    const alResolver = jest.fn();
    servicio.error({ titulo: 'Ups', mensaje: 'Falló.', alResolver });
    // When
    servicio.resolver('reintentar');
    servicio.resolver('cerrar');
    // Then
    expect(servicio.dialogoActivo()).toBeNull();
    expect(alResolver).toHaveBeenCalledTimes(1);
    expect(alResolver).toHaveBeenCalledWith('reintentar');
  });

  it('auto-cierra el diálogo y el toast al cumplirse su tiempo', () => {
    // Given
    const alResolver = jest.fn();
    servicio.info({ titulo: 'Info', mensaje: 'x', autoCierreMs: 1000, alResolver });
    servicio.toast({ variante: 'exito', mensaje: 'Guardado', autoCierreMs: 2000 });
    // When
    jest.advanceTimersByTime(1000);
    // Then
    expect(servicio.dialogoActivo()).toBeNull();
    expect(alResolver).toHaveBeenCalledWith('cerrar');
    expect(servicio.toasts()).toHaveLength(1);
    jest.advanceTimersByTime(1000);
    expect(servicio.toasts()).toHaveLength(0);
  });

  it('cerrarTodo limpia diálogo, carga y toasts', () => {
    servicio.cargando({ mensaje: 'x' });
    servicio.exito({ titulo: 't', mensaje: 'm' });
    servicio.toast({ variante: 'info', mensaje: 'a' });
    servicio.cerrarTodo();
    expect([servicio.dialogoActivo(), servicio.cargaActiva(), servicio.toasts().length]).toEqual([null, null, 0]);
  });

  it('invariante: la pila de toasts nunca es negativa y coincide con altas menos bajas efectivas', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.constant('alta' as const), fc.nat(20))), (ops) => {
        // Given un servicio nuevo y una secuencia de altas y bajas (por índice, incluso inexistentes)
        const s = new FeedbackService();
        const vivos = new Set<string>();
        const emitidos: string[] = [];
        for (const op of ops) {
          if (op === 'alta') {
            const id = s.toast({ variante: 'info', mensaje: 'x', autoCierreMs: 0 });
            emitidos.push(id);
            vivos.add(id);
          } else {
            const id = emitidos[op] ?? `inexistente-${op}`;
            s.cerrar(id);
            vivos.delete(id);
          }
        }
        // Then
        expect(s.toasts().length).toBeGreaterThanOrEqual(0);
        expect(s.toasts().map((t) => t.id).sort()).toEqual([...vivos].sort());
      }),
    );
  });
});
