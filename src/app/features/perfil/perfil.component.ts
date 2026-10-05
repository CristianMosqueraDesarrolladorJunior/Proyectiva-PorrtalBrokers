import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { ETIQUETA_ESTADO_CUENTA } from '../../core/models/cuenta.model';
import { SessionService } from '../../core/services/session.service';
import { PerfilService } from '../../core/services/perfil.service';
import {
  AvatarInitialsComponent,
  IconComponent,
  InfoBoxComponent,
  PageHeaderComponent,
} from '../../shared/components';

/**
 * "Mi perfil" del broker.
 *
 * Muestra únicamente la información de la sesión autenticada que entrega el
 * backend (`GET /api/v1/auth/session`): nombre, rol y estado de la Cuenta. El
 * detalle editable del perfil (datos personales, documentos, SARLAFT y
 * comisiones) aún no tiene endpoint en el API_Backend, por lo que no se
 * presenta: en su lugar se informa que estará disponible más adelante. No se
 * muestran datos simulados.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IconComponent, AvatarInitialsComponent, InfoBoxComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent {
  private readonly session = inject(SessionService);
  private readonly servicio = inject(PerfilService);

  /** Perfil de la sesión autenticada (nombre, rol, estado de cuenta). */
  protected readonly perfilSesion = this.session.perfil;

  /** Estado de la Cuenta derivado de la sesión real; `null` si no está disponible. */
  protected readonly estadoCuenta = this.servicio.estadoCuenta;

  /** Etiqueta visible del estado de la Cuenta (o `—` si no hay dato). */
  protected readonly etiquetaEstado = computed<string>(() => {
    const estado = this.estadoCuenta();
    return estado ? ETIQUETA_ESTADO_CUENTA[estado] : '—';
  });
}
