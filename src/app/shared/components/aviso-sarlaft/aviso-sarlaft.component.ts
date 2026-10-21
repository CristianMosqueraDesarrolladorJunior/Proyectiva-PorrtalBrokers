import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AlertBannerComponent } from '../alert-banner/alert-banner.component';

/**
 * Aviso temporal del flujo de registro mientras SARLAFT no funciona de forma confiable: el usuario debe
 * contactar a su ejecutivo/comercial. Componente aislado: para retirarlo basta quitar su selector
 * `<app-aviso-sarlaft />` (no condiciona ningún otro paso del flujo).
 */
@Component({
  selector: 'app-aviso-sarlaft',
  standalone: true,
  imports: [AlertBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-alert-banner variante="warning" titulo="Aviso SARLAFT">
      Por ahora el Conocimiento de Cliente digital puede no estar disponible. Contacta a tu ejecutivo o comercial
      para continuar el proceso: puedes usar el formato físico o coordinar con él una alternativa digital.
    </app-alert-banner>
  `,
})
export class AvisoSarlaftComponent {}
