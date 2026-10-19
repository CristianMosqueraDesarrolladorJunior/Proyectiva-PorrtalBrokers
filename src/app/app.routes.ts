import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { moduloGuard } from './core/guards/modulo.guard';

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
    title: 'Iniciar sesión — Portal Brokers Proyectiva',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'cambiar-clave',
    title: 'Crea tu contraseña — Portal Brokers Proyectiva',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/cambiar-clave/cambiar-clave.component').then(
        (m) => m.CambiarClaveComponent,
      ),
  },
  {
    path: 'registro-broker',
    title: 'Registro de broker — Portal Brokers Proyectiva',
    loadComponent: () =>
      import(
        './features/auth/pages/registro-broker/registro-broker.component'
      ).then((m) => m.RegistroBrokerComponent),
  },
  // Entrada del broker que llega ya autenticado desde Cien Cuadras (`/ingreso#token=...`).
  {
    path: 'ingreso',
    title: 'Ingresando — Portal Brokers Proyectiva',
    loadComponent: () =>
      import('./features/auth/pages/ingreso/ingreso.component').then(
        (m) => m.IngresoComponent,
      ),
  },

  // --- Shell autenticado (Req 4, 4.4) ---
  {
    path: 'app',
    canActivate: [authGuard, rolGuard('BROKER')],
    canActivateChild: [moduloGuard],
    loadComponent: () =>
      import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'seguimiento' },
      {
        path: 'seguimiento',
        title: 'Seguimiento — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/dashboard/seguimiento/seguimiento.component'
          ).then((m) => m.SeguimientoComponent),
      },
      {
        path: 'agente',
        title: 'Agente IA — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/agente/agente.component').then(
            (m) => m.AgenteComponent,
          ),
      },
      {
        path: 'radicacion',
        title: 'Nueva radicación — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/radicacion/pages/radicacion/radicacion.component'
          ).then((m) => m.RadicacionComponent),
      },
      {
        path: 'contrato',
        title: 'Crear contrato — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/contrato/pages/contrato/contrato.component').then(
            (m) => m.ContratoComponent,
          ),
      },
      {
        path: 'coberturas',
        title: 'Coberturas — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/coberturas/coberturas.component').then(
            (m) => m.CoberturasComponent,
          ),
      },
      {
        path: 'referidos',
        title: 'Referir cliente — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/referidos/referir/referir.component').then(
            (m) => m.ReferirComponent,
          ),
      },
      {
        path: 'estado-referidos',
        title: 'Estado de referidos — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/referidos/estado-referidos/estado-referidos.component'
          ).then((m) => m.EstadoReferidosComponent),
      },
      {
        path: 'cotizador',
        title: 'Cotizador — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/cotizador/cotizador-datos/cotizador-datos.component'
          ).then((m) => m.CotizadorDatosComponent),
      },
      {
        path: 'polizas',
        title: 'Pólizas — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/polizas/consulta-polizas.component').then(
            (m) => m.ConsultaPolizasComponent,
          ),
      },
      {
        path: 'comisiones',
        title: 'Comisiones — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/comisiones/comisiones.component').then((m) => m.ComisionesComponent),
      },
      {
        path: 'renovaciones',
        title: 'Renovaciones — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/renovaciones/renovaciones.component'
          ).then((m) => m.RenovacionesComponent),
      },
      {
        path: 'renovaciones/induccion',
        title: 'Inducción de póliza — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/renovacion/pages/induccion/induccion.component').then(
            (m) => m.InduccionComponent,
          ),
      },
      {
        path: 'renovaciones/detalle',
        title: 'Renovar póliza — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/gestion-renovacion/gestion-renovacion.component'
          ).then((m) => m.GestionRenovacionComponent),
      },
      {
        path: 'renovaciones/no-renovacion',
        title: 'No renovación — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/no-renovacion/no-renovacion.component'
          ).then((m) => m.NoRenovacionComponent),
      },
      {
        path: 'renovaciones/caso-especial',
        title: 'Caso especial — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/renovacion/pages/caso-especial/caso-especial.component'
          ).then((m) => m.CasoEspecialComponent),
      },
      // Un nuevo negocio es una radicación: la ruta vieja lleva al flujo real.
      { path: 'nuevo-negocio', pathMatch: 'full', redirectTo: 'radicacion' },
      {
        path: 'correccion',
        title: 'Corrección de documentos — Portal Brokers Proyectiva',
        loadComponent: () =>
          import(
            './features/correccion/pages/correccion/correccion.component'
          ).then((m) => m.CorreccionComponent),
      },
      {
        path: 'calendario',
        title: 'Calendario — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/calendario/calendario.component').then(
            (m) => m.CalendarioComponent,
          ),
      },
      {
        path: 'documentos',
        title: 'Documentos — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/documentos/documentos.component').then(
            (m) => m.DocumentosComponent,
          ),
      },
      {
        path: 'perfil',
        title: 'Mi perfil — Portal Brokers Proyectiva',
        loadComponent: () =>
          import('./features/perfil/perfil.component').then(
            (m) => m.PerfilComponent,
          ),
      },
      {
        path: 'ayuda',
        title: 'Ayuda — Portal Brokers Proyectiva',
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
    canActivate: [rolGuard('ADMINISTRADOR', 'COMERCIAL')],
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
        canActivate: [rolGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/admin/comerciales/comerciales.component').then(
            (m) => m.ComercialesComponent,
          ),
      },
      {
        path: 'prospectos',
        title: 'Prospectos — Consola Proyectiva',
        canActivate: [rolGuard('ADMINISTRADOR', 'COMERCIAL')],
        loadComponent: () =>
          import('./features/admin/prospectos/prospectos.component').then(
            (m) => m.ProspectosComponent,
          ),
      },
      {
        path: 'polizas',
        title: 'Pólizas — Consola Proyectiva',
        canActivate: [rolGuard('ADMINISTRADOR', 'COMERCIAL')],
        loadComponent: () =>
          import('./features/admin/polizas/polizas-admin.component').then(
            (m) => m.PolizasAdminComponent,
          ),
      },
      {
        path: 'renovaciones',
        title: 'Renovaciones — Consola Proyectiva',
        canActivate: [rolGuard('ADMINISTRADOR', 'COMERCIAL')],
        loadComponent: () =>
          import('./features/admin/renovaciones/renovaciones-admin.component').then(
            (m) => m.RenovacionesAdminComponent,
          ),
      },
      {
        path: 'referidos',
        title: 'Referidos — Consola Proyectiva',
        canActivate: [rolGuard('ADMINISTRADOR', 'COMERCIAL')],
        loadComponent: () =>
          import('./features/admin/referidos/referidos-admin.component').then(
            (m) => m.ReferidosAdminComponent,
          ),
      },
      {
        path: 'perfil',
        title: 'Mi perfil — Consola Proyectiva',
        loadComponent: () =>
          import('./features/admin/perfil/perfil-admin.component').then(
            (m) => m.PerfilAdminComponent,
          ),
      },
      {
        path: 'comisiones',
        title: 'Comisiones — Consola Proyectiva',
        canActivate: [rolGuard('ADMINISTRADOR', 'COMERCIAL')],
        loadComponent: () =>
          import('./features/admin/comisiones/comisiones-admin.component').then(
            (m) => m.ComisionesAdminComponent,
          ),
      },
    ],
  },

  // --- Redirecciones ---
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
