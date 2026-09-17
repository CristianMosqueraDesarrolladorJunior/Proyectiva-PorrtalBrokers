import { Routes } from '@angular/router';

/**
 * Rutas del feature Pólizas (Req 4.1, 16).
 *
 * Expone la Consulta de Pólizas por cédula con carga diferida (`loadComponent`).
 * El cableado al Shell_Aplicacion, la protección con `authGuard` y la navegación
 * al flujo de Renovacion (evento `iniciarRenovacion`) se realizan en la tarea 16.2.
 */
export const POLIZAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./consulta-polizas.component').then((m) => m.ConsultaPolizasComponent),
    title: 'Consulta de pólizas',
  },
];
