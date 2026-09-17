import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import {
  ConsultaAsistente,
  MensajeChat,
  SugerenciaRapida,
} from '../../../core/models/asistente.model';
import { AsistenteService } from '../../../core/services/asistente.service';
import {
  agregarMensaje,
  alternarVisibilidad,
  puedeEnviarConsulta,
  redactarPii,
} from './chat-asistente.helpers';

/** Mensaje inicial del asistente al abrir por primera vez la ventana (Req 38.4). */
const MENSAJE_INICIAL =
  '¡Hola Juan Pablo! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?';

/** Sugerencias rápidas ofrecidas al abrir el chat (Req 38.4). */
const SUGERENCIAS_INICIALES: readonly SugerenciaRapida[] = [
  { texto: 'Estado de mi solicitud' },
  { texto: '¿Cómo renovar?' },
  { texto: 'Contactar soporte' },
];

/** Mensaje de error orientativo mostrado ante fallo del Servicio_Asistente (Req 38.12). */
const MENSAJE_ERROR =
  'Lo siento, no pude procesar tu consulta en este momento. Por favor intenta de nuevo.';

/**
 * ChatAsistenteComponent — Componente_Compartido del Chat_Asistente Proyectiva
 * (Req 38, 39.1, 39.3, 35.18).
 *
 * Encapsula `chat-fab`, `chat-widget`, `chat-header`, `chat-avatar`, `chat-close`,
 * `chat-body`, `chat-msg` (variante bot), `msg-avatar`, `msg-bubble`,
 * `chat-suggestions`, `suggestion-pill`, `chat-input`, `send-btn` y
 * `chat-disclaimer`, totalmente tokenizado (Req 39.3).
 *
 * Estado con signals: visibilidad (`visible`), historial de la sesión
 * (`historial`), texto de entrada (`entrada`) y estado de carga/error. La lógica
 * de visibilidad, orden del historial, bloqueo de envío vacío, redacción de PII y
 * escape de contenido se delega en helpers puros (Properties 23–27).
 *
 * Seguridad: la PII se redacta antes de invocar el `AsistenteService` (Req 38.15)
 * y el contenido del bot se escapa con {{ interpolación }} de Angular antes de
 * renderizarse — nunca se usa `[innerHTML]` sin sanitizar (Req 38.16).
 *
 * Accesibilidad: el `chat-fab`, el `chat-input` y las `suggestion-pill` son
 * operables por teclado con foco visible; la región de mensajes usa `role="log"`
 * con `aria-live`, y el envío se dispara con Enter o con el `send-btn`
 * (Req 38.13, 38.14).
 */
@Component({
  selector: 'app-chat-asistente',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-asistente.component.html',
  styleUrl: './chat-asistente.component.scss',
})
export class ChatAsistenteComponent {
  private readonly asistente = inject(AsistenteService);

  /** Sugerencias rápidas mostradas bajo el mensaje inicial (Req 38.4, 38.8). */
  protected readonly sugerencias = SUGERENCIAS_INICIALES;

  /** Aviso visible de que el asistente es orientativo (Req 38.10). */
  protected readonly disclaimer =
    'Asistente potenciado por IA. Las respuestas son orientativas.';

  /** Estado de visibilidad de la ventana del chat (Req 38.2, 38.3). */
  protected readonly visible = signal(false);

  /** Historial de Mensaje_Chat de la sesión actual (Req 38.5–38.8). */
  protected readonly historial = signal<readonly MensajeChat[]>([
    { autor: 'asistente', contenido: MENSAJE_INICIAL },
  ]);

  /** Contenido actual del campo de entrada (chat-input) (Req 38.5, 38.11). */
  protected readonly entrada = signal('');

  /** Indica que hay una consulta en curso al Servicio_Asistente (Req 38.5). */
  protected readonly cargando = signal(false);

  /** Indica si la última consulta falló, para ofrecer reintento (Req 38.12). */
  protected readonly conError = signal(false);

  /** Texto de la última consulta enviada, usado para reintentar (Req 38.12). */
  private ultimaConsulta = '';

  /** Habilita el envío solo si la entrada no está vacía ni es solo espacios (Req 38.11). */
  protected get envioHabilitado(): boolean {
    return puedeEnviarConsulta(this.entrada()) && !this.cargando();
  }

  /** Abre o cierra la ventana del chat desde el fab o el control de cierre (Req 38.2, 38.3). */
  protected alternarChat(): void {
    this.visible.update(alternarVisibilidad);
  }

  /** Actualiza el signal de entrada al escribir en el chat-input (Req 38.5). */
  protected onEntrada(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.entrada.set(input.value);
  }

  /** Envía con Enter (sin Shift) si hay contenido válido (Req 38.5, 38.13). */
  protected onEnter(evento: Event): void {
    const teclado = evento as KeyboardEvent;
    if (teclado.shiftKey) {
      return;
    }
    evento.preventDefault();
    this.enviarDesdeEntrada();
  }

  /** Envía el contenido actual del chat-input tras validarlo (Req 38.5, 38.11). */
  protected enviarDesdeEntrada(): void {
    if (!this.envioHabilitado) {
      return;
    }
    const texto = this.entrada().trim();
    this.entrada.set('');
    this.enviarConsulta(texto);
  }

  /** Usa el texto de una Sugerencia_Rapida como consulta del Broker (Req 38.8). */
  protected enviarSugerencia(sugerencia: SugerenciaRapida): void {
    if (this.cargando()) {
      return;
    }
    this.enviarConsulta(sugerencia.texto);
  }

  /** Reintenta la última consulta tras un error del Servicio_Asistente (Req 38.12). */
  protected reintentar(): void {
    if (this.cargando() || !this.ultimaConsulta) {
      return;
    }
    this.conError.set(false);
    this.solicitarRespuesta(this.ultimaConsulta);
  }

  /**
   * Agrega el mensaje del Broker al historial y solicita la respuesta del
   * Asistente_IA (Req 38.5, 38.6). El historial preserva el orden (Property 24).
   */
  private enviarConsulta(texto: string): void {
    this.historial.update((previo) =>
      agregarMensaje(previo, { autor: 'broker', contenido: texto }),
    );
    this.solicitarRespuesta(texto);
  }

  /**
   * Redacta la PII, invoca el Servicio_Asistente y agrega la respuesta al
   * historial; ante fallo muestra un mensaje orientativo y habilita reintento
   * (Req 38.12, 38.15).
   */
  private solicitarRespuesta(texto: string): void {
    this.ultimaConsulta = texto;
    this.cargando.set(true);
    this.conError.set(false);

    const consulta: ConsultaAsistente = { consulta: redactarPii(texto) };
    this.asistente.consultar(consulta).subscribe({
      next: (respuesta) => {
        this.historial.update((previo) =>
          agregarMensaje(previo, {
            autor: 'asistente',
            contenido: respuesta.contenido,
          }),
        );
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.conError.set(true);
      },
    });
  }

  /** Mensaje orientativo de error mostrado en la burbuja de reintento (Req 38.12). */
  protected readonly mensajeError = MENSAJE_ERROR;

  /** trackBy del historial para render eficiente. */
  protected trackMensaje(indice: number): number {
    return indice;
  }
}
