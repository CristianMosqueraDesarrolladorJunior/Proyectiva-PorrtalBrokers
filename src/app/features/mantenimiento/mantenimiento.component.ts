import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { BotonComponent, EmptyStateComponent, PageHeaderComponent } from '../../shared/components';

/** Aviso que reemplaza un módulo del broker mientras está en mejora (ver core/util/mantenimiento.ts). */
@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, BotonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="mantenimiento-titulo">
      <app-page-header eyebrow="En mejora" tituloId="mantenimiento-titulo" titulo="Sección en mejora" />
      <app-empty-state
        icono="construction"
        titulo="Estamos trabajando para mejorar nuestro servicio"
        descripcion="Esta sección estará disponible muy pronto. Mientras tanto puedes cotizar, generar contratos y solicitar pólizas."
      >
        <div acciones>
          <app-boton variante="accent" icono="grid_view" (clicked)="irASeguimiento()">Ir a Seguimiento</app-boton>
        </div>
      </app-empty-state>
    </section>
  `,
})
export class MantenimientoComponent {
  private readonly router = inject(Router);

  protected irASeguimiento(): void {
    void this.router.navigate(['/app/seguimiento']);
  }
}
