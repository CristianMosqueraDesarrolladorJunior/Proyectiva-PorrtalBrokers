import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Mensaje genérico en español mostrado ante cualquier fallo (Req 28.5). */
export const MENSAJE_ERROR_GENERICO = 'Ocurrió un error. Intenta nuevamente.';

/**
 * Error normalizado que se propaga hacia la UI. No contiene trazas, cuerpos de
 * respuesta ni detalles internos del backend; solo un mensaje genérico y, de
 * forma opcional, el código de estado HTTP para lógica de presentación.
 */
export interface ErrorPortal {
  readonly mensaje: string;
  readonly estado?: number;
  /** Mismo código HTTP con el nombre que leen las pantallas (`err.status === 404`, `mensajeErrorIntegracion`). */
  readonly status?: number;
  /** Solo la lista de campos afectados del backend (nunca el motivo interno ni valores). */
  readonly error?: { readonly fields: readonly string[] };
}

/**
 * Lógica pura: transforma cualquier error en un {@link ErrorPortal} genérico.
 *
 * No se expone `error.message`, `error.error` ni la URL: cualquier detalle
 * interno o traza queda descartado para evitar fuga de información (Req 28.5).
 * Solo se conserva el código de estado HTTP cuando está disponible, útil para
 * decisiones de UI (por ejemplo, redirigir en 401) sin revelar detalles.
 * @param error error capturado (HTTP u otro).
 * @returns un error normalizado y seguro para la UI.
 */
export function normalizarError(error: unknown): ErrorPortal {
  if (error instanceof HttpErrorResponse) {
    const campos = (error.error as { fields?: unknown } | null)?.fields;
    return {
      mensaje: MENSAJE_ERROR_GENERICO,
      estado: error.status,
      status: error.status,
      error: { fields: Array.isArray(campos) ? campos.map(String) : [] },
    };
  }
  return { mensaje: MENSAJE_ERROR_GENERICO };
}

/**
 * Interceptor funcional que captura cualquier fallo y lo normaliza a un mensaje
 * genérico en español, sin exponer trazas ni detalles internos (Req 28.5).
 * Debe registrarse al final de la cadena para atrapar los errores producidos
 * por los interceptores previos (por ejemplo, timeouts).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      // Sesión vencida en una pantalla interna: al login con aviso (las rutas /auth/ manejan su propio 401).
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/auth/')
        && !router.url.startsWith('/login')) {
        void router.navigate(['/login'], { queryParams: { sesion: 'vencida' } });
      }
      return throwError(() => normalizarError(error));
    }),
  );
};
