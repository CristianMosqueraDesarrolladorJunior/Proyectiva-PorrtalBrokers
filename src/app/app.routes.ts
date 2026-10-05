import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';

/**
 * Tabla de rutas raíz del Portal de Autogestión de Brokers (Req 4, 29.4).
 *
 * Estructura:
 * - `/login` y `/registro-broker`: acceso público (fuera del Shell_Aplicacion).
 * - `/app`: contenedor autenticado (`ShellComponent`) protegido por `authGuard`
 *   (Req 4.4). Cada sección se carga de forma diferida con `loadComponent`/
 *   `loadChildren` (lazy loading, Req 29.4). Los `path` coinciden con los accesos
 *   del `SidebarComponent` para que `routerLinkActive` resalte la sección activa
 *   (Req 4.2).
 *
 * Toda la lógica autoritativa y de autorización reside en el API_Backend; el
 * enrutamiento solo controla la presentación.
 */
export const routes: Routes = [
  // --- Acceso público ---
  {
    path: 'login',
    title: 'Iniciar sesión — Proyectiva',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'registro-broker',
    title: 'Registro de broker — Proyectiva',
    loadComponent: () =>
      import(
        './features/auth/pages/registro-broker/registro-broker.component'
      ).then((m) => m.RegistroBrokerComponent),
  },

  // --- Shell autenticado (Req 4, 4.4) ---
  {
    path: 'app',
    canActivate: [authGuard, rolGuard('Broker')],
    loadComponent: () =>
      import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'seguimiento' },
      {
        path: 'seguimiento',
        title: 'Seguimiento — Proyectiva',
        loadComponent: () =>
          import(
            './features/dashboard/seguimiento/seguimiento.component'
          ).then((m) => m.SeguimientoComponent),
      },
      {
        path: 'agente',
        title: 'Agente IA — Proyectiva',
        loadComponent: () =>
          import('./features/agente/agente.component').then(
            (m) => m.AgenteComponent,
          ),
      },
      {
        path: 'radicacion',
        title: 'Nueva radicación — Proyectiva',
        loadComponent: () =>
          import(
            './features/radicacion/pages/radicacion/radicacion.component'
          ).then((m) => m.RadicacionComponent),
      },
      {
        path: 'contrato',
        title: 'Crear contrato — Proyectiva',
        loadComponent: () =>
          import('./features/contrato/pages/contrato/contrato.component').then(
            (m) => m.ContratoComponent,
          ),
      },
      {
        path: 'coberturas',
        title: 'Coberturas — Proyectiva',
        loadComponent: () =>
          import('./features/coberturas/coberturas.component').then(
            (m) => m.CoberturasComponent,
          ),
      },
      {
        path: 'referidos',
        title: 'Referir cliente — Proyectiva',
        loadComponent: () =>
          import('./features/referidos/referir/referir.component').then(
            (m) => m.ReferirComponent,
          ),
      },
      {
        path: 'estado-referidos',
        title: 'Estado de referidos — Proyectiva',
        loadComponent: () =>
          import(
            './features/referidos/estado-referidos/estado-referidos.component'
          ).then((m) => m.EstadoReferidosComponent),
      },
      {
        path: 'cotizador',
        title: 'Cotizador — Proyectiva',
        loadComponent: () =>
          import(
            './features/cotizador/cotizador-datos/cotizador-datos.component'
          ).then((m) => m.CotizadorDatosComponent),
      },
      {
        path: 'polizas',
        title: 'Pólizas — Proyectiva',
        loadComponent: () =>
          import('./features/polizas/consulta-polizas.component').then(
            (m) => m.ConsultaPolizasComponent,
          ),
      },
      {
        path: 'renovaciones',
        title: 'Renovaciones — Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/renovaciones/renovaciones.component'
          ).then((m) => m.RenovacionesComponent),
      },
      {
        path: 'renovaciones/detalle',
        title: 'Renovar póliza — Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/gestion-renovacion/gestion-renovacion.component'
          ).then((m) => m.GestionRenovacionComponent),
      },
      {
        path: 'renovaciones/no-renovacion',
        title: 'No renovación — Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/no-renovacion/no-renovacion.component'
          ).then((m) => m.NoRenovacionComponent),
      },
      {
        path: 'renovaciones/caso-especial',
        title: 'Caso especial — Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/caso-especial/caso-especial.component'
          ).then((m) => m.CasoEspecialComponent),
      },
      {
        path: 'nuevo-negocio',
        title: 'Nuevo negocio — Proyectiva',
        loadComponent: () =>
          import(
            './features/nuevo-negocio/nuevo-negocio/nuevo-negocio.component'
          ).then((m) => m.NuevoNegocioComponent),
      },
      {
        path: 'correccion',
        title: 'Corrección de documentos — Proyectiva',
        loadComponent: () =>
          import(
            './features/correccion/pages/correccion/correccion.component'
          ).then((m) => m.CorreccionComponent),
      },
      {
        path: 'calendario',
        title: 'Calendario — Proyectiva',
        loadComponent: () =>
          import('./features/calendario/calendario.component').then(
            (m) => m.CalendarioComponent,
          ),
      },
      {
        path: 'documentos',
        title: 'Documentos — Proyectiva',
        loadComponent: () =>
          import('./features/documentos/documentos.component').then(
            (m) => m.DocumentosComponent,
          ),
      },
      {
        path: 'perfil',
        title: 'Mi perfil — Proyectiva',
        loadComponent: () =>
          import('./features/perfil/perfil.component').then(
            (m) => m.PerfilComponent,
          ),
      },
      {
        path: 'ayuda',
        title: 'Ayuda — Proyectiva',
        loadComponent: () =>
          import('./features/ayuda/ayuda.component').then(
            (m) => m.AyudaComponent,
          ),
      },
    ],
  },

  // --- Consola de administración (diagrama 16): Administrador y Comercial ---
  {
    path: 'admin',
    canActivate: [rolGuard('Administrador', 'Comercial')],
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      {
        path: 'resumen',
        title: 'Resumen — Consola Proyectiva',
        loadComponent: () =>
          import('./features/admin/resumen/resumen.component').then(
            (m) => m.ResumenComponent,
          ),
      },
      {
        path: 'brokers',
        title: 'Brokers — Consola Proyectiva',
        loadComponent: () =>
          import('./features/admin/brokers/brokers.component').then(
            (m) => m.BrokersComponent,
          ),
      },
      {
        path: 'negocios',
        title: 'Negocios — Consola Proyectiva',
        loadComponent: () =>
          import('./features/admin/negocios/negocios.component').then(
            (m) => m.NegociosComponent,
          ),
      },
      {
        path: 'comerciales',
        title: 'Comerciales — Consola Proyectiva',
        canActivate: [rolGuard('Administrador')],
        loadComponent: () =>
          import('./features/admin/comerciales/comerciales.component').then(
            (m) => m.ComercialesComponent,
          ),
      },
    ],
  },

  // --- Redirecciones ---
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
