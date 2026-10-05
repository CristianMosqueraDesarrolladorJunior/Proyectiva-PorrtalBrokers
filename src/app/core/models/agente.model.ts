/**
 * Contrato del Agente IA del portal (diagramas 10–12).
 *
 * El front solo habla con `POST /api/v1/agente/mensajes` (BFF). Nunca llama al
 * LLM ni al agente. La respuesta trae mensajes de texto y una lista de intents
 * UI de lista cerrada que el lienzo valida antes de pintar.
 */

/** Intención que resuelve el `router` del grafo (diagrama 11). */
export type IntencionAgente =
  | 'cotizar'
  | 'radicar'
  | 'referir'
  | 'renovar'
  | 'documentos'
  | 'consultar';

/** Interrupt pendiente del grafo: lo que el agente espera del broker. */
export type PendienteAgente = 'dato' | 'archivo' | 'confirmacion' | null;

/** Evento que el broker envía al BFF. Solo uno de los tres campos va lleno. */
export interface EventoAgente {
  readonly hiloId: string;
  readonly mensaje?: string;
  /** Archivo ya subido al backend: al grafo solo llega el id y el tipo. */
  readonly archivo?: { readonly id: string; readonly tipo: string; readonly nombre: string };
  readonly confirmado?: boolean;
}

/** Paso del grafo mostrado en la traza (transparencia del flujo LangGraph). */
export interface PasoTraza {
  readonly nodo: string;
  readonly tipo: 'guardrail' | 'router' | 'tool' | 'interrupt' | 'ui' | 'fin';
  readonly detalle: string;
}

/** Par etiqueta/valor que el lienzo pinta en tarjetas y resúmenes. */
export interface CampoIntent {
  readonly etiqueta: string;
  readonly valor: string;
}

/** Regla de un documento solicitado por `ui_solicitar_archivos`. */
export interface ReglaArchivoIntent {
  readonly id: string;
  readonly etiqueta: string;
  readonly descripcion: string;
}

/** Estado de validación de un documento (validar_documento). */
export interface EstadoDocumentoIntent {
  readonly etiqueta: string;
  readonly ok: boolean;
  readonly motivo: string;
}

/**
 * Intents UI de lista cerrada (diagrama 10, "Contrato de intents UI").
 * Cualquier otro `tipo` se descarta en el front.
 */
export type IntentUi =
  | {
      readonly tipo: 'llenar';
      readonly flujo: 'radicacion' | 'referido' | 'renovacion' | 'cotizacion';
      readonly campos: readonly CampoIntent[];
    }
  | {
      readonly tipo: 'mostrar';
      readonly tarjeta: 'cotizacion' | 'sarlaft' | 'documentos' | 'solicitudes' | 'exito';
      readonly titulo: string;
      readonly tono: 'info' | 'success' | 'warning' | 'danger';
      readonly campos: readonly CampoIntent[];
      readonly documentos?: readonly EstadoDocumentoIntent[];
    }
  | {
      readonly tipo: 'solicitar_archivos';
      readonly titulo: string;
      readonly reglas: readonly ReglaArchivoIntent[];
    }
  | {
      readonly tipo: 'entregar_documento';
      readonly nombre: string;
      readonly descripcion: string;
      readonly url: string;
    }
  | {
      readonly tipo: 'confirmar';
      readonly accion: string;
      readonly endpoint: string;
      readonly resumen: readonly CampoIntent[];
    }
  | {
      readonly tipo: 'navegar';
      readonly ruta: string;
      readonly etiqueta: string;
    };

/** Respuesta del BFF a un evento del broker. */
export interface RespuestaAgente {
  readonly hiloId: string;
  readonly mensajes: readonly string[];
  readonly intents: readonly IntentUi[];
  readonly pendiente: PendienteAgente;
  readonly sugerencias: readonly string[];
  readonly traza: readonly PasoTraza[];
}
