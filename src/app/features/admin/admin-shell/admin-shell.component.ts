import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { LayoutService } from '../../../core/services/layout.service';
import { SessionService } from '../../../core/services/session.service';
import { IconComponent } from '../../../shared/components';
import { AccesoSidebar, SidebarComponent } from '../../shell/sidebar/sidebar.component';

const ACCESOS_ADMIN: readonly AccesoSidebar[] = [
  { ruta: 'resumen', icono: 'monitoring', etiqueta: 'Resumen' },
  { ruta: 'brokers', icono: 'groups', etiqueta: 'Brokers' },
  { ruta: 'negocios', icono: 'description', etiqueta: 'Negocios' },
  { ruta: 'comerciales', icono: 'badge', etiqueta: 'Comerciales' },
];

const ACCESOS_COMERCIAL: readonly AccesoSidebar[] = [
  { ruta: 'resumen', icono: 'monitoring', etiqueta: 'Mi resumen' },
  { ruta: 'brokers', icono: 'groups', etiqueta: 'Mis brokers' },
  { ruta: 'negocios', icono: 'description', etiqueta: 'Negocios' },
];

/**
 * Shell de la consola de administración (diagrama 16).
 *
 * Reutiliza el sidebar del portal con los accesos del rol: el Administrador ve
 * Comerciales; el Comercial solo su cartera. Carga una vez los datos mock.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, IconComponent],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['../../shell/shell.component.scss', './admin-shell.component.scss'],
})
export class AdminShellComponent {
  private readonly session = inject(SessionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly admin = inject(AdminService);
  protected readonly layout = inject(LayoutService);

  protected readonly perfil = this.session.perfil;
  protected readonly accesos = computed(() =>
    this.perfil()?.rol === 'Administrador' ? ACCESOS_ADMIN : ACCESOS_COMERCIAL,
  );
  protected readonly sidebarAbierto = signal(false);

  constructor() {
    this.admin.cargar().subscribe();
  }

  protected reintentarCarga(): void {
    this.admin.cargar().subscribe();
  }

  protected alternarSidebar(): void {
    this.sidebarAbierto.update((v) => !v);
  }

  protected cerrarSidebar(): void {
    this.sidebarAbierto.set(false);
  }

  protected salir(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
