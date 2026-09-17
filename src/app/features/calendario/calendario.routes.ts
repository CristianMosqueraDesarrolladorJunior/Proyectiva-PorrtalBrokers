import { Routes } from '@angular/router';

/**
 * Rutas del feature Calendario (Req 4.1, 33.1, 33.2).
 *
 * Expone la Seccion_Calendario con carga diferida (`loadComponent`). El cableado
 * al Shell_Aplicacion y la protección con `authGuard` se realizan en la tarea 16.2.
 */
export const CALENDARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./calendario.component').then((m) => m.CalendarioComponent),
    title: 'Calendario',
  },
];
