import { Routes } from '@angular/router';

/**
 * Ruta de la página de login del Broker (`/login`) (Req 1, 2).
 *
 * Se expone como `Routes` con carga diferida del `LoginComponent` standalone
 * para su cableado desde `app.routes.ts` (tarea 16.2), alineado con la
 * estrategia de lazy loading por feature (design.md, Req 29.4).
 */
export const loginRoutes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión — Proyectiva',
    loadComponent: () =>
      import('./login.component').then((m) => m.LoginComponent),
  },
];
