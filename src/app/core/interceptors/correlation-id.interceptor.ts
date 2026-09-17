import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

/** Nombre del encabezado de trazabilidad agregado a cada solicitud saliente. */
export const CORRELATION_ID_HEADER = 'Correlation-ID';

/**
 * Genera un identificador de correlación único por solicitud.
 * Usa la API estándar del navegador `crypto.randomUUID()` (UUID v4).
 * @returns un UUID v4 en formato string.
 */
export function generarCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Lógica pura: clona la solicitud agregando el encabezado `Correlation-ID`.
 * Es idempotente respecto a la solicitud original (no la muta) y no sobrescribe
 * un `Correlation-ID` ya presente, para respetar trazas propagadas.
 * @param req solicitud HTTP original.
 * @param correlationId identificador de correlación a agregar.
 * @returns una nueva solicitud con el encabezado de correlación.
 */
export function conCorrelationId<T>(
  req: HttpRequest<T>,
  correlationId: string
): HttpRequest<T> {
  if (req.headers.has(CORRELATION_ID_HEADER)) {
    return req;
  }
  return req.clone({ setHeaders: { [CORRELATION_ID_HEADER]: correlationId } });
}

/**
 * Interceptor funcional que agrega un encabezado `Correlation-ID` único por
 * solicitud para permitir la trazabilidad extremo a extremo (Observabilidad).
 * No transporta PII ni tokens; solo un UUID opaco.
 */
export const correlationIdInterceptor: HttpInterceptorFn = (req, next) =>
  next(conCorrelationId(req, generarCorrelationId()));
