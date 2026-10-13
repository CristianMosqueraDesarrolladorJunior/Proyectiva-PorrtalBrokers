import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CatalogoService } from '../../core/services/catalogo.service';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

/**
 * Centro de ayuda (Req 33.5, 33.6): contactos directos, canales oficiales y preguntas frecuentes, todo desde los
 * catálogos de BD (`cat_contacto_ayuda`, `cat_faq_ayuda`).
 */
@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ayuda.component.html',
  styleUrl: './ayuda.component.scss',
})
export class AyudaComponent {
  private readonly catalogo = inject(CatalogoService);

  private readonly canales = this.catalogo.opciones('contacto_ayuda');
  protected readonly contactos = this.canales.filter((c) => c['tipo'] === 'directo');
  protected readonly oficiales = this.canales.filter((c) => c['tipo'] === 'oficial');
  protected readonly faqs = this.catalogo.opciones('faq_ayuda');
}
