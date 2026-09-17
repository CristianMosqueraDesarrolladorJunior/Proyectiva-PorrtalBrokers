import { Routes } from '@angular/router';

/**
 * Rutas del feature Ayuda (Req 4.1, 33.5, 33.6).
 *
 * Expone la Seccion_Ayuda con carga diferida (`loadComponent`). El cableado al
 * Shell_Aplicacion y la protección con `authGuard` se realizan en la tarea 16.2.
 */
export const AYUDA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ayuda.component').then((m) => m.AyudaComponent),
    title: 'Ayuda',
  },
];
