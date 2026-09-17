import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

/**
 * Lógica pura: clona la solicitud habilitando el envío de credenciales.
 *
 * Al establecer `withCredentials: true`, el navegador adjunta automáticamente
 * la cookie de sesión `HttpOnly` en las solicitudes al `API_Backend`. El token
 * de sesión NUNCA se lee ni se almacena en JavaScript (Req 28.1): permanece en
 * una cookie `HttpOnly` inaccesible desde el DOM/JS, mitigando robo por XSS.
 * @param req solicitud HTTP original (no se muta).
 * @returns una nueva solicitud con `withCredentials` habilitado.
 */
export function conCredenciales<T>(req: HttpRequest<T>): HttpRequest<T> {
  return req.clone({ withCredentials: true });
}

/**
 * Interceptor funcional que envía credenciales con `withCredentials: true`
 * para que la cookie `HttpOnly` de sesión viaje con cada solicitud (Req 28.1).
 * No lee ni almacena el token en JS.
 */
export const authCookieInterceptor: HttpInterceptorFn = (req, next) =>
  next(conCredenciales(req));
