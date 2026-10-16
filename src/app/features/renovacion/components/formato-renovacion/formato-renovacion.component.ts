import { ChangeDetectionStrategy, Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { FormatoRenovacionResponse } from '../../../../core/models/renovacion.model';
import { RenovacionService } from '../../../../core/services/renovacion.service';
import { descargarArchivo } from '../../../../core/util/descargar-archivo';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import { aEntero, pesos } from '../../../../core/util/numeros-letras';
import {
  revisarIncremento,
  topeDeCanon,
  type DestinoInmueble,
} from '../../../../core/util/reglas-renovacion';
import {
  AlertBannerComponent,
  BotonComponent,
  FormFieldComponent,
  FormSectionCardComponent,
  InfoListCardComponent,
  MoneyInputComponent,
  SegmentedControlComponent,
} from '../../../../shared/components';
import type { ItemInfoLista, OpcionSegmentada } from '../../../../shared/components';

/**
 * Formato oficial de renovación de Bolívar, relleno por el portal (renovación física).
 *
 * El broker escribe el canon actual y el nuevo; se previsualiza el tope por IPC (vivienda) y si hace
 * falta un «otro sí». El PDF lo genera el backend (revalida todo) y se descarga para firmarlo y
 * cargarlo en el paso siguiente.
 */
@Component({
  selector: 'app-formato-renovacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BotonComponent,
    FormFieldComponent,
    FormSectionCardComponent,
    InfoListCardComponent,
    MoneyInputComponent,
    SegmentedControlComponent,
  ],
  template: `
    <app-form-section-card
      [numero]="numero"
      icono="edit_document"
      titulo="Formato oficial de renovación"
      subtitulo="Lo rellenamos por ti con los datos de la póliza. Descárgalo, fírmalo con el cliente y cárgalo abajo."
    >
      <div class="fr">
        <app-form-field label="Destino del inmueble" controlId="fr-destino">
          <app-segmented-control
            [opciones]="destinos"
            [valor]="destino()"
            ariaLabel="Destino del inmueble"
            (valorChange)="destino.set($any($event))"
          />
        </app-form-field>

        <div class="fr__valores">
          <app-form-field label="Canon actual" controlId="fr-canon-actual" [requerido]="true">
            <app-money-input inputId="fr-canon-actual" [valor]="canonActual()" (valorChange)="canonActual.set($event)" />
          </app-form-field>
          <app-form-field
            label="Canon con la renovación"
            controlId="fr-canon-nuevo"
            [requerido]="true"
            [error]="intento() ? revision().error : ''"
          >
            <app-money-input
              inputId="fr-canon-nuevo"
              [valor]="canonNuevo()"
              [invalido]="intento() && !!revision().error"
              (valorChange)="canonNuevo.set($event)"
            />
          </app-form-field>
        </div>

        <app-info-list-card titulo="Tope sin otro sí" icono="trending_up" [items]="resumen()" />

        @if (revision().aviso) {
          <app-alert-banner variante="warning" titulo="Necesitas un otro sí">{{ revision().aviso }}</app-alert-banner>
        }
        @if (error()) {
          <app-alert-banner variante="error" titulo="No se pudo generar el formato">{{ error() }}</app-alert-banner>
        }
        @if (generado(); as f) {
          <app-alert-banner variante="success" titulo="Formato generado" icono="task_alt">
            Lo descargamos en tu equipo{{ f.requiereOtroSi ? '; recuerda adjuntar el otro sí firmado' : '' }}.
          </app-alert-banner>
        }

        <div class="fr__acciones">
          @if (generado()) {
            <app-boton variante="ghost" icono="download" (clicked)="descargar()">Descargar otra vez</app-boton>
          }
          <app-boton variante="outline" icono="picture_as_pdf" [disabled]="generando()" (clicked)="generar()">
            {{ generando() ? 'Generando…' : 'Generar formato oficial' }}
          </app-boton>
        </div>
      </div>
    </app-form-section-card>
  `,
  styles: [
    `
      .fr {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .fr__valores {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(var(--grid-kpi-min-col), 1fr));
        gap: var(--space-4);
      }
      .fr__acciones {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--space-3);
      }
    `,
  ],
})
export class FormatoRenovacionComponent {
  private readonly renovaciones = inject(RenovacionService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) numeroPoliza = '';
  /** Número de la sección dentro del paso que lo aloja. */
  @Input() numero = 1;

  /** Canon y destino que ya conoce la póliza: se precargan para que el broker no los reescriba. */
  @Input() set canonInicial(valor: number | null | undefined) {
    if (valor && valor > 0 && !this.canonActual()) {
      this.canonActual.set(String(Math.round(valor)));
    }
  }
  @Input() set destinoInicial(valor: string | null | undefined) {
    if (valor) {
      this.destino.set(/comerc/i.test(valor) ? 'comercio' : 'vivienda');
    }
  }

  protected readonly destinos: readonly OpcionSegmentada[] = [
    { valor: 'vivienda', etiqueta: 'Vivienda', icono: 'home' },
    { valor: 'comercio', etiqueta: 'Comercio', icono: 'storefront' },
  ];

  protected readonly destino = signal<DestinoInmueble>('vivienda');
  protected readonly canonActual = signal('');
  protected readonly canonNuevo = signal('');
  protected readonly intento = signal(false);
  protected readonly generando = signal(false);
  protected readonly error = signal('');
  protected readonly generado = signal<FormatoRenovacionResponse | null>(null);

  /** IPC vigente y su año (`parametro_negocio` IPC_RENOVACION / ANIO_IPC). */
  private readonly catalogo = inject(CatalogoService);
  private readonly ipc = this.catalogo.parametro('IPC_RENOVACION');
  private readonly anioIpc = this.catalogo.parametro('ANIO_IPC');

  private readonly actual = computed(() => aEntero(this.canonActual()) ?? 0);
  private readonly nuevo = computed(() => aEntero(this.canonNuevo()) ?? 0);

  protected readonly revision = computed(() => {
    if (!(this.actual() > 0)) return { error: 'Escribe el canon actual de la póliza.', aviso: '' };
    return revisarIncremento(this.actual(), this.nuevo(), this.destino(), this.ipc, this.anioIpc);
  });

  protected readonly resumen = computed<readonly ItemInfoLista[]>(() => {
    const tope = this.actual() > 0 ? topeDeCanon(this.actual(), this.destino(), this.ipc) : null;
    return [
      {
        titulo: 'IPC aplicado',
        valor: this.destino() === 'comercio' ? 'Sin tope' : `${this.ipc.toFixed(2)} %`,
      },
      {
        titulo: 'Canon máximo',
        valor: this.destino() === 'comercio' ? 'Libre' : tope === null ? '—' : pesos(tope),
        descripcion: 'Por encima de este valor se exige un otro sí firmado.',
      },
    ];
  });

  protected generar(): void {
    this.intento.set(true);
    this.error.set('');
    if (this.revision().error) return;
    this.generando.set(true);
    this.renovaciones
      .generarFormato(this.numeroPoliza, {
        destino: this.destino(),
        canonActual: this.actual(),
        canonNuevo: this.nuevo(),
        fechaRenovacion: new Date().toISOString().slice(0, 10),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (formato) => {
          this.generando.set(false);
          this.generado.set(formato);
          this.descargar();
        },
        error: (err: unknown) => {
          this.generando.set(false);
          this.error.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected descargar(): void {
    this.renovaciones
      .descargarFormato(this.numeroPoliza)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pdf) => descargarArchivo(pdf, `formato-renovacion-${this.numeroPoliza}.pdf`),
        error: (err: unknown) => this.error.set(mensajeErrorIntegracion(err)),
      });
  }
}
