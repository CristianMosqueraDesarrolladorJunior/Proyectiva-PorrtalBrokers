import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  BotonComponent,
  CardComponent,
  FormFieldComponent,
  GridLayoutComponent,
  AlertBannerComponent,
  EscaleritaLoaderComponent,
  SuccessScreenComponent,
} from '../../../shared/components';
import {
  ReferidosService,
  type ReferidoRequest,
} from '../../../core/services/referidos.service';
import { validarReferido } from '../referido-validacion';

/** Opciones de producto de interés ofrecidas al Broker (fiel al prototipo, Req 15.1). */
const PRODUCTOS_INTERES: readonly string[] = [
  'Seguro de Hogar',
  'Seguro de Vida',
  'Seguro de Carros',
];

/** Estado del envío del Referido para controlar loaders y confirmación (Req 15.3). */
type EstadoEnvioReferido = 'inactivo' | 'enviando' | 'exito';

/**
 * ReferirComponent — Formulario de "Referir cliente" (Req 15.1, 15.2, 15.3).
 *
 * Captura los datos de un Referido (nombre completo, cédula, celular, correo
 * opcional, producto de interés y comentario opcional) reutilizando los
 * Componentes_Compartidos `FormFieldComponent` y `BotonComponent`. La validez del
 * formulario se decide con la lógica pura `validarReferido` (nombre, cédula, celular
 * y producto obligatorios; correo y comentario opcionales). Al enviar un Referido
 * válido, `ReferidosService` lo registra en el API_Backend y se confirma el envío
 * con `SuccessScreenComponent`.
 *
 * El backend revalida siempre (Req 15.3); esta validación es únicamente por UX.
 */
@Component({
  selector: 'app-referir',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    BotonComponent,
    CardComponent,
    FormFieldComponent,
    GridLayoutComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
    SuccessScreenComponent,
  ],
  templateUrl: './referir.component.html',
  styleUrl: './referir.component.scss',
})
export class ReferirComponent {
  private readonly referidosService = inject(ReferidosService);
  private readonly router = inject(Router);

  /** Opciones de producto de interés para el selector (Req 15.1). */
  protected readonly productos = PRODUCTOS_INTERES;

  /** Navega a la sección "Estado referidos" (Req 15.4). */
  protected verEstadoReferidos(): void {
    void this.router.navigate(['/app/estado-referidos']);
  }

  /** Limpia el formulario sin enviar (acción "Cancelar" del prototipo). */
  protected cancelar(): void {
    this.nuevoReferido();
  }

  /** Campos del formulario de Referido (Req 15.1). */
  protected readonly nombre = signal('');
  protected readonly cedula = signal('');
  protected readonly celular = signal('');
  protected readonly correo = signal('');
  protected readonly producto = signal('');
  protected readonly comentario = signal('');

  /** Indica si el Broker ya intentó enviar (para mostrar errores de campo). */
  protected readonly intentoEnvio = signal(false);

  /** Estado del envío (inactivo/enviando/éxito) (Req 15.3). */
  protected readonly estadoEnvio = signal<EstadoEnvioReferido>('inactivo');

  /** Mensaje de error genérico de envío, sin exponer detalles internos. */
  protected readonly errorEnvio = signal('');

  /** Radicado de confirmación devuelto por el backend (Req 15.3). */
  protected readonly radicado = signal('');

  /** Resultado de la validación pura del formulario (Req 15.2). */
  protected readonly validacion = computed(() =>
    validarReferido({
      nombre: this.nombre(),
      cedula: this.cedula(),
      celular: this.celular(),
      producto: this.producto(),
    }),
  );

  /** Verdadero si el formulario es válido para enviar (Req 15.2). */
  protected readonly formularioValido = computed(() => this.validacion().formularioValido);

  /** Verdadero mientras se envía el Referido (bloquea el botón, Req 15.3). */
  protected readonly enviando = computed(() => this.estadoEnvio() === 'enviando');

  /** Verdadero cuando el envío finalizó con éxito (muestra confirmación, Req 15.3). */
  protected readonly envioExitoso = computed(() => this.estadoEnvio() === 'exito');

  /** Mensaje de error del campo nombre cuando corresponde mostrarlo. */
  protected readonly errorNombre = computed(() =>
    this.intentoEnvio() && !this.validacion().nombreValido
      ? 'El nombre completo es obligatorio'
      : '',
  );

  /** Mensaje de error del campo cédula cuando corresponde mostrarlo. */
  protected readonly errorCedula = computed(() =>
    this.intentoEnvio() && !this.validacion().cedulaValida ? 'La cédula es obligatoria' : '',
  );

  /** Mensaje de error del campo celular cuando corresponde mostrarlo. */
  protected readonly errorCelular = computed(() =>
    this.intentoEnvio() && !this.validacion().celularValido ? 'El celular es obligatorio' : '',
  );

  /** Mensaje de error del campo producto cuando corresponde mostrarlo. */
  protected readonly errorProducto = computed(() =>
    this.intentoEnvio() && !this.validacion().productoValido
      ? 'El producto de interés es obligatorio'
      : '',
  );

  /**
   * Envía el Referido si el formulario es válido (Req 15.2, 15.3).
   * Marca el intento de envío para revelar errores de campo; si el formulario es
   * inválido no realiza la solicitud. Al registrarse correctamente, muestra la
   * confirmación; ante un fallo, muestra un mensaje genérico.
   */
  protected enviar(): void {
    this.intentoEnvio.set(true);
    this.errorEnvio.set('');
    if (!this.formularioValido()) {
      return;
    }

    const request = this.construirRequest();
    this.estadoEnvio.set('enviando');
    this.referidosService.referir(request).subscribe({
      next: (respuesta) => {
        this.radicado.set(respuesta.radicado);
        this.estadoEnvio.set('exito');
      },
      error: () => {
        this.estadoEnvio.set('inactivo');
        this.errorEnvio.set('No fue posible registrar el referido. Intenta nuevamente.');
      },
    });
  }

  /**
   * Reinicia el formulario para registrar un nuevo Referido tras una confirmación.
   */
  protected nuevoReferido(): void {
    this.nombre.set('');
    this.cedula.set('');
    this.celular.set('');
    this.correo.set('');
    this.producto.set('');
    this.comentario.set('');
    this.intentoEnvio.set(false);
    this.errorEnvio.set('');
    this.radicado.set('');
    this.estadoEnvio.set('inactivo');
  }

  /**
   * Construye el `ReferidoRequest` a partir de los campos capturados, omitiendo
   * los opcionales vacíos (correo y comentario) (Req 15.1).
   */
  private construirRequest(): ReferidoRequest {
    const correo = this.correo().trim();
    const comentario = this.comentario().trim();
    return {
      nombre: this.nombre().trim(),
      cedula: this.cedula().trim(),
      celular: this.celular().trim(),
      producto: this.producto().trim(),
      ...(correo.length > 0 ? { correo } : {}),
      ...(comentario.length > 0 ? { comentario } : {}),
    };
  }
}
