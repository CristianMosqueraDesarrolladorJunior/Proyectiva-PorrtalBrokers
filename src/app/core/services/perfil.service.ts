import { Injectable, computed, inject } from '@angular/core';

import type { EstadoCuenta, PerfilCuenta } from '../models/cuenta.model';
import { SessionService } from './session.service';

/**
 * Servicio del perfil de la Cuenta.
 *
 * El estado de la Cuenta (`PROSPECTO`/`REGISTRADO`) proviene de la sesión real
 * emitida por el backend (`GET /api/v1/auth/session`), que `AuthService` publica
 * en `SessionService`.
 *
 * El detalle completo del perfil (datos personales, documentos y comisiones) aún
 * no tiene endpoint en el API_Backend, por lo que `perfil` permanece en `null`
 * hasta que exista el contrato. No se exponen datos simulados: la UI debe tratar
 * `null` como "sin información disponible".
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly session = inject(SessionService);

  /**
   * Detalle del perfil de la Cuenta. `null` mientras el backend no exponga el
   * endpoint correspondiente (no se devuelven datos simulados).
   */
  readonly perfil = computed<PerfilCuenta | null>(() => null);

  /** Estado de la Cuenta derivado de la sesión real del backend. */
  readonly estadoCuenta = computed<EstadoCuenta | null>(
    () => this.session.perfil()?.estadoCuenta ?? null,
  );
}
