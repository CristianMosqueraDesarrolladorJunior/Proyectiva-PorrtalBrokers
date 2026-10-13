import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconComponent } from '../icon/icon.component';

/** Evento de la bitácora (actividad de un broker, historial de un negocio, movimientos del sistema). */
export interface EventoBitacora {
  readonly fecha: string;
  readonly tipo: string;
  readonly descripcion: string;
  readonly broker?: string | null;
  readonly referencia?: string | null;
}

const ICONOS: Readonly<Record<string, string>> = {
  Cotización: 'calculate',
  Contrato: 'description',
  Radicación: 'send',
  Gestión: 'manage_history',
  Documento: 'upload_file',
  'Cuenta de cobro': 'receipt_long',
  Pago: 'payments',
  Prospecto: 'person_add',
  Inducción: 'assignment_return',
};

/** Línea de tiempo de eventos con fecha y hora, del más reciente al más antiguo. */
@Component({
  selector: 'app-bitacora',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, EmptyStateComponent, IconComponent],
  template: `
    @if (eventos.length === 0) {
      <app-empty-state icono="history" [titulo]="mensajeVacio" />
    } @else {
      <ol class="bi">
        @for (e of eventos; track $index) {
          <li class="bi__evento">
            <span class="bi__icono"><app-icon [nombre]="icono(e.tipo)" [tamano]="18" /></span>
            <div class="bi__texto">
              <div class="bi__cab">
                <strong>{{ e.tipo }}</strong>
                <time [attr.datetime]="e.fecha">{{ e.fecha | date: 'd MMM y, h:mm a' }}</time>
              </div>
              <p>{{ e.descripcion }}</p>
              @if (e.broker || e.referencia) {
                <small>{{ e.broker }}{{ e.broker && e.referencia ? ' · ' : '' }}{{ e.referencia }}</small>
              }
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: [
    `
      .bi {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .bi__evento {
        position: relative;
        display: grid;
        grid-template-columns: 32px minmax(0, 1fr);
        gap: var(--space-3);
        padding-bottom: var(--space-4);
      }
      .bi__evento:not(:last-child)::before {
        content: '';
        position: absolute;
        left: 15px;
        top: 32px;
        bottom: 0;
        width: 2px;
        background: var(--sb-border);
      }
      .bi__icono {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-full);
        background: var(--sb-surface-low);
        color: var(--sb-tertiary);
        border: 1px solid var(--sb-border);
      }
      .bi__texto {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 0;
      }
      .bi__cab {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: var(--space-2);
        font-size: var(--text-body);
        color: var(--sb-on-surface);
      }
      time,
      small {
        font-size: var(--text-caption);
        color: var(--sb-secondary);
      }
      p {
        margin: 0;
        font-size: var(--text-body);
        color: var(--sb-on-surface);
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class BitacoraComponent {
  @Input({ required: true }) eventos: readonly EventoBitacora[] = [];
  @Input() mensajeVacio = 'Sin actividad registrada';

  protected icono(tipo: string): string {
    return ICONOS[tipo] ?? 'event_note';
  }
}
