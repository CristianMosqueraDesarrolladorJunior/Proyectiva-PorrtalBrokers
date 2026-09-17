import { Routes } from '@angular/router';

/**
 * Rutas del feature Referidos (Req 4.1, 15).
 *
 * Expone "Referir cliente" y "Estado referidos" con carga diferida
 * (`loadComponent`). El cableado al Shell_Aplicacion y la protección con
 * `authGuard` se realizan en la tarea 16.2.
 */
export const REFERIDOS_ROUTES: Routes = [
  {
    path: 'referir',
    loadComponent: () =>
      import('./referir/referir.component').then((m) => m.ReferirComponent),
    title: 'Referir cliente',
  },
  {
    path: 'estado',
    loadComponent: () =>
      import('./estado-referidos/estado-referidos.component').then(
        (m) => m.EstadoReferidosComponent,
      ),
    title: 'Estado referidos',
  },
  { path: '', redirectTo: 'referir', pathMatch: 'full' },
];
