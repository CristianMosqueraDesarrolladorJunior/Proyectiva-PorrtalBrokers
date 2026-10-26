import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AdminService } from '../../../core/services/admin.service';
import { ConsolaService } from '../../../core/services/consola.service';
import { HistorialDocumentalComponent, PageHeaderComponent, type TipoDocumentoHistorial } from '../../../shared/components';

/** Historial documental de la consola: el administrador ve todo y el comercial su cartera (lo resuelve el servidor). */
@Component({
  selector: 'app-documentos-admin',
  standalone: true,
  imports: [HistorialDocumentalComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="vista" aria-labelledby="documentos-admin-titulo">
      <app-page-header
        [eyebrow]="esAdmin ? 'Consola de administración' : 'Mi cartera'"
        tituloId="documentos-admin-titulo"
        titulo="Documentos"
        subtitulo="Contratos y cotizaciones generados por los brokers, para buscarlos, verlos y auditarlos."
      ></app-page-header>
      <app-historial-documental [fuente]="fuente" [descargar]="descargar" [conBroker]="true" />
    </section>
  `,
})
export class DocumentosAdminComponent {
  private readonly consola = inject(ConsolaService);
  protected readonly esAdmin = inject(AdminService).esAdmin();
  protected readonly fuente = () => this.consola.historialDocumental();
  protected readonly descargar = (tipo: TipoDocumentoHistorial, referencia: string) =>
    this.consola.documentoHistorial(tipo, referencia);
}
