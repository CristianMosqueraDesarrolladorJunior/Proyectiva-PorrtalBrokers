import { Injectable, effect, signal } from '@angular/core';

/** Cotización elegida para radicar (viaja del cotizador a la radicación y al contrato). */
export interface CotizacionParaRadicar {
  readonly referencia: string;
  readonly departamento: string;
  readonly ciudad: string;
  readonly tipoInmueble: string;
  readonly canon: number;
  readonly administracion?: number;
  readonly fechaInicioVigencia: string;
  readonly mesesVigencia: number;
  readonly total: number;
}

/** Contrato ya generado y guardado en el backend; la radicación lo exige. */
export interface ContratoGenerado {
  readonly referencia: string;
}

const CLAVE = 'portal.borradorRadicacion';

interface Estado {
  readonly cotizacion: CotizacionParaRadicar | null;
  readonly contrato: ContratoGenerado | null;
  readonly formulario: Readonly<Record<string, unknown>> | null;
}

/**
 * Borrador del flujo Cotización → Radicación → Contrato. Conserva los datos al navegar entre
 * pantallas (y al recargar, en sessionStorage) para que nada se pierda al ir a crear el contrato.
 */
@Injectable({ providedIn: 'root' })
export class BorradorRadicacionService {
  private readonly inicial = leer();

  readonly cotizacion = signal<CotizacionParaRadicar | null>(this.inicial.cotizacion);
  readonly contrato = signal<ContratoGenerado | null>(this.inicial.contrato);
  readonly formulario = signal<Readonly<Record<string, unknown>> | null>(this.inicial.formulario);

  constructor() {
    effect(() => {
      const estado: Estado = {
        cotizacion: this.cotizacion(),
        contrato: this.contrato(),
        formulario: this.formulario(),
      };
      try {
        sessionStorage.setItem(CLAVE, JSON.stringify(estado));
      } catch {
        // Sin sessionStorage (modo privado/bloqueado) el borrador vive solo en memoria.
      }
    });
  }

  /** Inicia una radicación nueva desde una cotización (descarta contrato/formulario previos). */
  iniciarDesdeCotizacion(cotizacion: CotizacionParaRadicar): void {
    this.cotizacion.set(cotizacion);
    this.contrato.set(null);
    this.formulario.set(null);
  }

  limpiar(): void {
    this.cotizacion.set(null);
    this.contrato.set(null);
    this.formulario.set(null);
  }
}

function leer(): Estado {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    if (crudo) {
      return JSON.parse(crudo) as Estado;
    }
  } catch {
    // Borrador ilegible o storage no disponible: se arranca vacío.
  }
  return { cotizacion: null, contrato: null, formulario: null };
}
