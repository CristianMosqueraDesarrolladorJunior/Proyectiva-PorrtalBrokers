import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AlertBannerComponent,
  BotonComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  RadioGroupComponent,
  SuccessScreenComponent,
} from '../../../../shared/components';
import type { OpcionRadio } from '../../../../shared/components/radio-group/radio-group.component';
import type { TarjetaSeguimiento } from '../../../../shared/components/success-screen/success-screen.component';
import type {
  MotivoNoRenovacion,
  NoRenovacionRequest,
} from '../../../../core/models/renovacion.model';
import { RenovacionService } from '../../../../core/services/renovacion.service';
import {
  ETIQUETA_MOTIVO_NO_RENOVACION,
  MOTIVOS_NO_RENOVACION,
  puedeEnviarNoRenovacion,
} from '../../no-renovacion-habilitacion';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
/** Estado del envío de la No Renovación para controlar loaders y confirmación (Req 22.2). */
type EstadoEnvioNoRenovacion = 'inactivo' | 'enviando' | 'exito';

/**
 * NoRenovacionComponent — Notificar No Renovación (Req 22.1, 22.2, 22.3).
 *
 * Solicita un motivo principal del conjunto cerrado definido (costo elevado,
 * cambio de proveedor, ya no necesita la cobertura, insatisfacción con el
 * servicio) y observaciones opcionales, REUTILIZANDO sin duplicar los
 * Componentes_Compartidos `RadioGroupComponent`, `FormFieldComponent` y
 * `BotonComponent`. La habilitación del envío se decide con la lógica pura
 * `puedeEnviarNoRenovacion` (Property 29): habilitado si y solo si hay un motivo
 * del conjunto; las observaciones no afectan la habilitación. Si el Broker intenta
 * confirmar sin motivo, el Portal impide el envío e indica que debe seleccionar uno
 * (Req 22.3).
 *
 * Al confirmar con un motivo válido, `RenovacionService` registra la solicitud en
 * el API_Backend (`POST /api/v1/renovaciones/noRenovacion`) y se confirma con
 * `SuccessScreenComponent` mostrando el número de radicado (Req 22.2). El backend
 * revalida siempre; no hay lógica autoritativa en el frontend.
 */
@Component({
  selector: 'app-no-renovacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, 
    FormsModule,
    RadioGroupComponent,
    FormFieldComponent,
    BotonComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
    SuccessScreenComponent,
  ],
  templateUrl: './no-renovacion.component.html',
  styleUrl: './no-renovacion.component.scss',
})
export class NoRenovacionComponent {
  private readonly renovacionService = inject(RenovacionService);

  /** Número de póliza sobre la que se notifica la No Renovación (Req 22). */
  @Input() numeroPoliza = '';

  /** Opciones de motivo presentadas como tarjetas de selección (Req 22.1). */
  protected readonly opcionesMotivo: readonly OpcionRadio[] = MOTIVOS_NO_RENOVACION.map(
    (motivo) => ({ valor: motivo, etiqueta: ETIQUETA_MOTIVO_NO_RENOVACION[motivo] }),
  );

  /** Motivo seleccionado por el Broker (vacío mientras no elige) (Req 22.1). */
  protected readonly motivo = signal('');

  /** Observaciones opcionales (Req 22.1). */
  protected readonly observaciones = signal('');

  /** Indica si el Broker ya intentó enviar (para revelar el error de motivo). */
  protected readonly intentoEnvio = signal(false);

  /** Estado del envío (inactivo/enviando/éxito) (Req 22.2). */
  protected readonly estadoEnvio = signal<EstadoEnvioNoRenovacion>('inactivo');

  /** Mensaje de error genérico de envío, sin exponer detalles internos. */
  protected readonly errorEnvio = signal('');

  /** Radicado de confirmación devuelto por el backend (Req 22.2). */
  protected readonly radicado = signal('');

  /** Verdadero si el envío está habilitado: hay un motivo del conjunto (Req 22.1, 22.3). */
  protected readonly envioHabilitado = computed(() =>
    puedeEnviarNoRenovacion(this.motivo()),
  );

  /** Verdadero mientras se envía la No Renovación (bloquea el botón, Req 22.2). */
  protected readonly enviando = computed(() => this.estadoEnvio() === 'enviando');

  /** Verdadero cuando el envío finalizó con éxito (muestra confirmación, Req 22.2). */
  protected readonly envioExitoso = computed(() => this.estadoEnvio() === 'exito');

  /** Mensaje de error del motivo cuando se intenta enviar sin seleccionarlo (Req 22.3). */
  protected readonly errorMotivo = computed(() =>
    this.intentoEnvio() && !this.envioHabilitado()
      ? 'Debes seleccionar un motivo para notificar la no renovación'
      : '',
  );

  /** Tarjetas de seguimiento de la pantalla de éxito (radicado y estado) (Req 22.2). */
  protected readonly tarjetas = computed<readonly TarjetaSeguimiento[]>(() => [
    { etiqueta: 'RADICADO', valor: this.radicado() },
    { etiqueta: 'ESTADO', valor: '🟡 En proceso' },
  ]);

  /**
   * Confirma la No Renovación si hay un motivo seleccionado (Req 22.2, 22.3).
   * Marca el intento de envío para revelar el error de motivo; si no hay motivo del
   * conjunto no realiza la solicitud (Req 22.3). Al registrarse correctamente,
   * muestra la confirmación con radicado; ante un fallo, muestra un mensaje genérico.
   */
  protected confirmar(): void {
    this.intentoEnvio.set(true);
    this.errorEnvio.set('');
    if (!this.envioHabilitado()) {
      return;
    }

    const observaciones = this.observaciones().trim();
    const request: NoRenovacionRequest = {
      numeroPoliza: this.numeroPoliza,
      motivo: this.motivo() as MotivoNoRenovacion,
      ...(observaciones.length > 0 ? { observaciones } : {}),
    };

    this.estadoEnvio.set('enviando');
    this.renovacionService.noRenovar(request).subscribe({
      next: (respuesta) => {
        this.radicado.set(respuesta.radicado);
        this.estadoEnvio.set('exito');
      },
      error: () => {
        this.estadoEnvio.set('inactivo');
        this.errorEnvio.set(
          'No fue posible registrar la no renovación. Intenta nuevamente.',
        );
      },
    });
  }
}
