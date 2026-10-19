import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

import { DialogoEstadoComponent } from './shared/components/feedback/dialogo-estado/dialogo-estado.component';
import { OverlayCargaComponent } from './shared/components/feedback/overlay-carga/overlay-carga.component';
import { ToastHostComponent } from './shared/components/feedback/toast-host/toast-host.component';
import { FeedbackService } from './shared/services/feedback/feedback.service';

/**
 * Componente raíz standalone del Portal de Autogestión de Brokers.
 *
 * Sirve como punto de montaje del enrutador. El Shell_Aplicacion (sidebar +
 * main-content + Chat_Asistente) se implementa en el feature `shell` (ver task 16.1)
 * y se monta a través de las rutas. Se usa el patrón `inject()` alineado con PROYECTIVA.
 * También monta, una sola vez, los hosts del feedback de estado (`FeedbackService`).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DialogoEstadoComponent, OverlayCargaComponent, ToastHostComponent],
  template: `
    <router-outlet />
    <app-toast-host />
    <app-overlay-carga variante="pantalla" [visible]="!!feedback.cargaActiva()" [mensaje]="feedback.cargaActiva()?.mensaje ?? ''" />
    <!-- Siempre montado (sin @if) para que el diálogo devuelva el foco al cerrarse. -->
    @let d = feedback.dialogoActivo();
    <app-dialogo-estado
      [abierto]="!!d"
      [variante]="d?.variante ?? 'info'"
      [titulo]="d?.titulo ?? ''"
      [mensaje]="d?.mensaje ?? ''"
      [acciones]="d?.acciones ?? {}"
      [cierrePorEsc]="d?.cierrePorEsc ?? true"
      [cierrePorFondo]="d?.cierrePorFondo ?? true"
      (confirmar)="feedback.resolver('confirmar')"
      (cancelar)="feedback.resolver('cancelar')"
      (reintentar)="feedback.resolver('reintentar')"
      (cerrar)="feedback.resolver('cerrar')"
    />
  `,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  /** Router inyectado con `inject()` para navegación programática futura. */
  protected readonly router = inject(Router);
  protected readonly feedback = inject(FeedbackService);
}
