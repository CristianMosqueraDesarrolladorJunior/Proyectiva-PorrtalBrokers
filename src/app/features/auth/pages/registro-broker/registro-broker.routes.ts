import { Routes } from '@angular/router';

/**
 * Ruta del formulario de Solicitud_Registro_Broker (`/registro-broker`) (Req 3, 2.3).
 *
 * Se expone como `Routes` con carga diferida del `RegistroBrokerComponent`
 * standalone para su cableado desde `app.routes.ts` (tarea 16.2), alineado con
 * la estrategia de lazy loading por feature (design.md, Req 29.4).
 */
export const registroBrokerRoutes: Routes = [
  {
    path: 'registro-broker',
    title: 'Solicitud de registro de broker — Proyectiva',
    loadComponent: () =>
      import('./registro-broker.component').then(
        (m) => m.RegistroBrokerComponent,
      ),
  },
];
