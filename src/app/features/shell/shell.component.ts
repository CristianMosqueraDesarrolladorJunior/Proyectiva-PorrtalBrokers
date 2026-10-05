import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import type { Notificacion } from '../../core/models/notificacion.model';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly servicioNotificaciones = inject(NotificacionesService);

  protected readonly notificaciones = this.servicioNotificaciones.lista;
  protected readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);

  @ViewChild('contenido', { static: true }) private contenido?: ElementRef<HTMLElement>;

  constructor() {
    this.servicioNotificaciones.cargar();
    // Accesibilidad: al cambiar de sección, el foco pasa al contenido para que teclado y
    // lectores de pantalla no queden en el menú.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.contenido?.nativeElement.focus({ preventScroll: true }));
  }

  protected irAlContenido(evento: Event): void {
    evento.preventDefault();
    this.contenido?.nativeElement.focus();
  }

  protected readonly sidebarAbierto = signal(false);

  protected alternarSidebar(): void {
    this.sidebarAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarAbierto.set(false);
  }

  protected abrirNotificacion(notificacion: Notificacion): void {
    this.servicioNotificaciones.marcarLeida(notificacion.id);
    void this.router.navigateByUrl(notificacion.ruta);
  }

  protected marcarTodasLeidas(): void {
    this.servicioNotificaciones.marcarTodasLeidas();
  }

  /** Cierra la sesión y vuelve al login (aunque falle la llamada al backend). */
  protected salir(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }

  /** Búsqueda global: lleva el término al listado de Seguimiento. */
  protected buscar(texto: string): void {
    void this.router.navigate(['/app/seguimiento'], { queryParams: { q: texto } });
  }
}
