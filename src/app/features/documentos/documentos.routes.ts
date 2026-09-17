import { Routes } from '@angular/router';

/**
 * Rutas del feature Documentos (Req 4.1, 33.3, 33.4).
 *
 * Expone la Seccion_Documentos con carga diferida (`loadComponent`). El cableado
 * al Shell_Aplicacion y la protección con `authGuard` se realizan en la tarea 16.2.
 */
export const DOCUMENTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./documentos.component').then((m) => m.DocumentosComponent),
    title: 'Documentos',
  },
];
