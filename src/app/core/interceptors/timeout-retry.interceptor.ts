import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, retry, timeout } from 'rxjs';

/** Tiempo límite por intento de solicitud, en milisegundos (15s) (Req 29.5). */
export const TIMEOUT_MS = 15_000;

/** Número máximo de reintentos tras el intento inicial (Req 29.5). */
export const MAX_REINTENTOS = 3;

/**
 * Aplica la política de timeout y reintento acotado a un flujo de solicitud HTTP.
 *
 * Comportamiento (Req 29.5):
 * - `timeout({ each: TIMEOUT_MS })` cancela el intento actual si supera 15s y
 *   emite un `TimeoutError`. Se aplica por intento (dentro de la tubería que
 *   `retry` reejecuta), de modo que cada reintento obtiene una ventana de 15s.
 * - `retry({ count: MAX_REINTENTOS })` reintenta hasta 3 veces ante cualquier
 *   error (incluido el timeout), es decir, un máximo de 4 ejecuciones totales.
 * - Si tras agotar los reintentos persiste el error, este se propaga para que el
 *   interceptor de errores lo normalice hacia la UI.
 *
 * Es una función pura sobre observables: no produce efectos secundarios y no
 * depende de la inyección de dependencias, para facilitar su prueba (PBT 3.2).
 * @param source$ flujo del evento HTTP producido por el siguiente manejador.
 * @param timeoutMs tiempo límite por intento (por defecto {@link TIMEOUT_MS}).
 * @param maxReintentos reintentos máximos (por defecto {@link MAX_REINTENTOS}).
 * @returns un flujo con la política de timeout/reintento aplicada.
 */
export function aplicarTimeoutReintento<T>(
  source$: Observable<T>,
  timeoutMs: number = TIMEOUT_MS,
  maxReintentos: number = MAX_REINTENTOS
): Observable<T> {
  return source$.pipe(
    timeout({ each: timeoutMs }),
    retry({ count: maxReintentos })
  );
}

/**
 * Interceptor funcional que aplica un timeout de 15s por intento y reintenta
 * hasta 3 veces las solicitudes que fallan o se exceden en tiempo (Req 29.5).
 */
export const timeoutRetryInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> =>
  aplicarTimeoutReintento(next(req));
