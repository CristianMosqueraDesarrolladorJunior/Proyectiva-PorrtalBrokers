import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BotonComponent,
  FormFieldComponent,
  DataTableComponent,
  AlertBannerComponent,
  EscaleritaLoaderComponent,
} from '../../shared/components';
import type { AccionFila, ColumnaTabla } from '../../shared/components';
import { estadoABadge } from '../../shared/pipes/estado-badge';
import { PolizasService } from '../../core/services/polizas.service';
import { Poliza } from '../../core/models/poliza.model';
import { esPolizaRenovable } from './poliza-renovable';
import { computed } from '@angular/core';

/** Estado de la consulta para controlar loader, error y vacío (Req 16.1). */
type EstadoConsulta = 'inicial' | 'consultando' | 'resultado' | 'error';

/** Cantidad mínima de dígitos aceptada para la cédula del cliente. */
const CEDULA_MIN_DIGITOS = 6;

/** Cantidad máxima de dígitos aceptada para la cédula del cliente. */
const CEDULA_MAX_DIGITOS = 10;

/**
 * ConsultaPolizasComponent — Consulta de Pólizas por cédula (Req 16).
 *
 * Permite al Broker buscar las pólizas de un cliente por su cédula y muestra el
 * listado con número, cliente, producto, fecha de vencimiento y estado, usando
 * `BadgeEstadoComponent` con la variante tokenizada correspondiente al estado
 * (Renovada / Próxima a renovar / A punto de vencer) mediante el mapeo puro
 * `estadoABadge` (Req 16.1, 16.2, 16.3).
 *
 * Al seleccionar una Poliza "Próxima a renovar" o "A punto de vencer", emite
 * `iniciarRenovacion` con la Poliza para iniciar el flujo de Renovacion (Req 16.4);
 * el cableado de la ruta de renovación se realiza en la tarea 16.2.
 *
 * Reutiliza los Componentes_Compartidos `FormFieldComponent`, `BotonComponent`,
 * `BadgeEstadoComponent`, `AlertBannerComponent` y `EscaleritaLoaderComponent`.
 * Consume `PolizasService`; la presentación no realiza cálculo autoritativo.
 */
@Component({
  selector: 'app-consulta-polizas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    BotonComponent,
    FormFieldComponent,
    DataTableComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
  ],
  templateUrl: './consulta-polizas.component.html',
  styleUrl: './consulta-polizas.component.scss',
})
export class ConsultaPolizasComponent {
  private readonly polizasService = inject(PolizasService);

  /**
   * Emite la Poliza seleccionada para iniciar el flujo de Renovacion (Req 16.4).
   * El contenedor/enrutador (tarea 16.2) escucha este evento y navega a la
   * sección de Renovacion conservando el contexto de la póliza.
   */
  @Output() readonly iniciarRenovacion = new EventEmitter<Poliza>();

  /** Cédula del cliente ingresada por el Broker (Req 16.1). */
  protected readonly cedula = signal('');

  /** Indica si el Broker ya intentó buscar (para revelar el error de campo). */
  protected readonly intentoBusqueda = signal(false);

  /** Estado de la consulta (inicial/consultando/resultado/error). */
  protected readonly estado = signal<EstadoConsulta>('inicial');

  /** Pólizas devueltas por el backend para la cédula consultada (Req 16.2). */
  protected readonly polizas = signal<readonly Poliza[]>([]);

  /**
   * Verdadero cuando la cédula ingresada es válida para consultar: solo dígitos
   * con longitud entre 6 y 10 (validación de cliente por UX; el backend revalida).
   */
  protected cedulaValida(): boolean {
    const valor = this.cedula().trim();
    return (
      /^\d+$/.test(valor) &&
      valor.length >= CEDULA_MIN_DIGITOS &&
      valor.length <= CEDULA_MAX_DIGITOS
    );
  }

  /** Mensaje de error del campo cédula cuando corresponde mostrarlo. */
  protected errorCedula(): string {
    return this.intentoBusqueda() && !this.cedulaValida()
      ? 'Ingresa una cédula válida (solo dígitos, entre 6 y 10 caracteres)'
      : '';
  }

  /** Verdadero mientras la consulta está en curso (bloquea el botón). */
  protected consultando(): boolean {
    return this.estado() === 'consultando';
  }

  /**
   * Indica si desde la Poliza puede iniciarse la Renovacion (Req 16.4).
   * @param poliza Poliza a evaluar.
   * @returns `true` si su estado es "Próxima a renovar" o "A punto de vencer".
   */
  protected esRenovable(poliza: Poliza): boolean {
    return esPolizaRenovable(poliza.estado);
  }

  /** Columnas del DataTable de pólizas con sort, insignia de estado y acción (Req 16.2, 16.3). */
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'numero', header: 'Número', ordenable: true },
    { key: 'cliente', header: 'Cliente', ordenable: true },
    { key: 'producto', header: 'Producto', ordenable: true },
    { key: 'fechaVencimiento', header: 'Vencimiento', ordenable: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    { key: 'renovar', header: '', tipo: 'accion', textoAccion: 'Renovar', alinear: 'derecha' },
  ];

  /** Filas mapeadas para el DataTable, con la variante de insignia por estado (Req 16.3). */
  protected readonly filas = computed(() =>
    this.polizas().map((p) => ({
      numero: p.numero,
      cliente: p.cliente,
      producto: p.producto,
      fechaVencimiento: p.fechaVencimiento,
      estado: p.estado,
      estadoVariante: estadoABadge(p.estado).replace('badge-', ''),
      renovar: this.esRenovable(p) ? 'Renovar' : '',
    })),
  );

  /** Gestiona la acción "Renovar" desde el DataTable (Req 16.4). */
  protected onAccionPoliza(evento: AccionFila): void {
    const poliza = this.polizas()[evento.indice];
    if (poliza) {
      this.onIniciarRenovacion(poliza);
    }
  }

  /**
   * Busca las pólizas del cliente por su cédula (Req 16.1, 16.2).
   * Marca el intento para revelar errores de campo; si la cédula es inválida no
   * realiza la solicitud. Ante un fallo muestra un mensaje genérico.
   */
  protected buscar(): void {
    this.intentoBusqueda.set(true);
    if (!this.cedulaValida()) {
      return;
    }

    this.estado.set('consultando');
    this.polizas.set([]);
    this.polizasService.consultarPorDocumento(this.cedula().trim()).subscribe({
      next: (polizas) => {
        this.polizas.set(polizas);
        this.estado.set('resultado');
      },
      error: () => {
        this.estado.set('error');
      },
    });
  }

  /**
   * Inicia el flujo de Renovacion para la Poliza seleccionada si su estado lo
   * permite (Req 16.4). Emite `iniciarRenovacion` con la Poliza.
   * @param poliza Poliza próxima a renovar o a punto de vencer.
   */
  protected onIniciarRenovacion(poliza: Poliza): void {
    if (!this.esRenovable(poliza)) {
      return;
    }
    this.iniciarRenovacion.emit(poliza);
  }
}
