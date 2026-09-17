import { Routes } from '@angular/router';

/**
 * Rutas del feature Cotizador (Req 4.1, 7).
 *
 * Expone la entrada de datos y coberturas del Cotizador con carga diferida
 * (`loadComponent`). El resultado, las acciones (PDF/modificar/radicar) y el
 * cableado al Shell_Aplicacion con `authGuard` se completan en tareas posteriores
 * (9.5 y 16.2).
 */
export const COTIZADOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cotizador-datos/cotizador-datos.component').then(
        (m) => m.CotizadorDatosComponent,
      ),
    title: 'Cotizador',
  },
];
