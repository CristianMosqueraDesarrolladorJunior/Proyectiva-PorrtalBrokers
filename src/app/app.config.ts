import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import {
  authCookieInterceptor,
  correlationIdInterceptor,
  errorInterceptor,
  timeoutRetryInterceptor
} from './core/interceptors';
import { CatalogoService } from './core/services/catalogo.service';

/**
 * Configuración raíz de la aplicación standalone del Portal de Autogestión de Brokers.
 * Registra el enrutador, animaciones asíncronas y HttpClient (consumo REST del API_Backend).
 *
 * Interceptores HTTP funcionales (el ORDEN importa):
 * 1. `correlationIdInterceptor` — agrega `Correlation-ID` por solicitud (trazabilidad).
 * 2. `authCookieInterceptor` — envía la cookie `HttpOnly` con `withCredentials` (Req 28.1).
 * 3. `timeoutRetryInterceptor` — timeout de 15s por intento y hasta 3 reintentos (Req 29.5).
 * 4. `errorInterceptor` — normaliza cualquier fallo a un mensaje genérico (Req 28.5);
 *    va al final para atrapar los errores producidos por los interceptores anteriores.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([
        correlationIdInterceptor,
        authCookieInterceptor,
        timeoutRetryInterceptor,
        errorInterceptor
      ])
    ),
    // Catálogos de negocio desde la BD (sin bloquear el arranque: si fallan, se reintentan al usarlos).
    provideAppInitializer(() => {
      inject(CatalogoService).cargar().subscribe();
    }),
  ]
};
