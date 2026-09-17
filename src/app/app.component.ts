import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

/**
 * Componente raíz standalone del Portal de Autogestión de Brokers.
 *
 * Sirve como punto de montaje del enrutador. El Shell_Aplicacion (sidebar +
 * main-content + Chat_Asistente) se implementa en el feature `shell` (ver task 16.1)
 * y se monta a través de las rutas. Se usa el patrón `inject()` alineado con PROYECTIVA.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  /** Router inyectado con `inject()` para navegación programática futura. */
  protected readonly router = inject(Router);
}
