import { defer, firstValueFrom, throwError } from 'rxjs';

import { aplicarTimeoutReintento } from './timeout-retry.interceptor';

describe('aplicarTimeoutReintento', () => {
  function fallaCon(status: number) {
    let intentos = 0;
    const flujo$ = defer(() => {
      intentos++;
      return throwError(() => ({ status }));
    });
    return { flujo$, intentos: () => intentos };
  }

  it('reintenta las fallas transitorias (5xx)', async () => {
    const f = fallaCon(503);
    await expect(firstValueFrom(aplicarTimeoutReintento(f.flujo$, 1000, 3))).rejects.toEqual({ status: 503 });
    expect(f.intentos()).toBe(4);
  });

  it('no reintenta un 4xx', async () => {
    const f = fallaCon(422);
    await expect(firstValueFrom(aplicarTimeoutReintento(f.flujo$, 1000, 3))).rejects.toEqual({ status: 422 });
    expect(f.intentos()).toBe(1);
  });

  it('sin reintentos (POST) se ejecuta una sola vez', async () => {
    const f = fallaCon(500);
    await expect(firstValueFrom(aplicarTimeoutReintento(f.flujo$, 1000, 0))).rejects.toEqual({ status: 500 });
    expect(f.intentos()).toBe(1);
  });
});
