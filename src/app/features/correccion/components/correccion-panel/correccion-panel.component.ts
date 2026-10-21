import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concat, switchMap, toArray } from 'rxjs';

import { RadicacionService, type ProcedimientoResponse } from '../../../../core/services/radicacion.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  IconComponent,
  type ArchivoSeleccionado,
  type ReglaDocumentoUploader,
} from '../../../../shared/components';

/**
 * Corrección documental pedida por el área en el Warehouse (estado "Pendiente Corrección Documental") o envío de una
 * radicación que no alcanzó a enviarse, resuelta DENTRO del detalle de Seguimiento: muestra qué corregir, recibe los
 * documentos nuevos y devuelve la solicitud a "Pendiente Validación Documental". Nunca navega a otra vista: al terminar
 * o cancelar emite el evento y el contenedor decide (siempre hay salida).
 */
@Component({
  selector: 'app-correccion-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent, DocUploaderComponent, IconComponent],
  template: `
    <section class="cp" aria-label="Gestionar corrección de documentos">
      @if (listo()) {
        <app-alert-banner variante="success" titulo="¡Listo, enviamos tus documentos!" icono="check_circle">
          Quedaron en revisión del área ({{ etiquetaEstado() }}). Te avisaremos cuando avance.
        </app-alert-banner>
        <div class="cp__acciones">
          <app-boton variante="accent" (clicked)="terminar.emit()">Entendido</app-boton>
        </div>
      } @else {
        @if (pendienteEnvio()) {
          <app-alert-banner variante="warning" titulo="Tu radicación aún no nos llegó" icono="schedule_send">
            Carga los documentos que faltan y envíala para que la revisemos.
          </app-alert-banner>
        } @else {
          <section class="cp__pedido" aria-label="Qué debes corregir">
            <h4><app-icon nombre="rule" [tamano]="18" /> Qué debes corregir</h4>
            <ul>
              @for (c of procedimiento().procedimiento.correcciones; track $index) {
                <li><strong>{{ c.documento }}</strong> — {{ c.observacion }}</li>
              } @empty {
                <li>{{ procedimiento().procedimiento.observacion || 'Revisa los documentos que cargaste.' }}</li>
              }
            </ul>
          </section>
        }

        <app-doc-uploader [reglas]="reglas()" [cargados]="cargadosVista()" [disabled]="enviando()" (archivoSeleccionado)="onArchivo($event)" />

        @if (errorEnvio()) {
          <p class="cp__error" role="alert">{{ errorEnvio() }}</p>
        }
        <div class="cp__acciones">
          <app-boton variante="ghost" [disabled]="enviando()" (clicked)="cancelar.emit()">Ver detalle de la solicitud</app-boton>
          <app-boton variante="accent" icono="upload_file" [disabled]="!puedeEnviar() || enviando()" (clicked)="enviar()">
            {{ enviando() ? 'Enviando, puede tardar unos segundos…' : pendienteEnvio() ? 'Enviar radicación' : 'Enviar corrección' }}
          </app-boton>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .cp {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .cp__pedido {
        padding: var(--space-4);
        border: 1px solid var(--sb-tint-accent-border);
        border-radius: var(--radius-xl);
        background: var(--sb-tint-accent-bg);
      }
      .cp__pedido h4 {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: var(--space-0) var(--space-0) var(--space-3);
        font-family: var(--font-family-heading);
        color: var(--sb-on-surface);
      }
      .cp__pedido ul {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        margin: var(--space-0);
        padding-left: var(--space-5);
      }
      .cp__error {
        margin: var(--space-0);
        color: var(--color-danger);
      }
      .cp__acciones {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--space-2);
      }
    `,
  ],
})
export class CorreccionPanelComponent {
  private readonly radicacion = inject(RadicacionService);
  private readonly catalogo = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Solicitud a corregir y su procedimiento ya consultado por el contenedor (estado del área). */
  readonly referencia = input.required<string>();
  readonly procedimiento = input.required<ProcedimientoResponse>();

  /** Se enviaron los documentos y la solicitud volvió a revisión del área. */
  readonly enviada = output<ProcedimientoResponse>();
  /** El broker cierra el mensaje de éxito. */
  readonly terminar = output<void>();
  /** El broker prefiere ver el detalle sin corregir ahora. */
  readonly cancelar = output<void>();

  protected readonly enviando = signal(false);
  protected readonly listo = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  /** Respuesta del envío: el estado nuevo manda sobre el que llegó del contenedor. */
  private readonly actualizado = signal<ProcedimientoResponse | null>(null);

  private readonly archivos = new Map<string, File>();
  protected readonly cargados = signal<Readonly<Record<string, string>>>({});

  private readonly datos = computed(() => this.actualizado() ?? this.procedimiento());
  protected readonly etiquetaEstado = computed(() => this.datos().procedimiento.etiqueta);

  /** Radicación creada que no alcanzó a enviarse: se completa aquí. */
  protected readonly pendienteEnvio = computed(() => this.procedimiento().procedimiento.estadoPortal === 'RADICADA');

  /** Lo ya cargado en el servidor más lo elegido ahora: los documentos cargados no salen como pendientes. */
  protected readonly cargadosVista = computed<Readonly<Record<string, string>>>(() => {
    const servidor = Object.fromEntries(this.procedimiento().procedimiento.documentos.map((d) => [d.tipo, d.nombre]));
    return { ...servidor, ...this.cargados() };
  });

  /** Documentos requeridos que aún no tiene la solicitud (solo aplica a la radicación sin enviar). */
  private readonly faltantes = computed(() => {
    const p = this.procedimiento().procedimiento;
    if (!this.pendienteEnvio()) return new Set<string>();
    const tiene = new Set(p.documentos.map((d) => d.tipo));
    return new Set(p.documentosRequeridos.filter((t) => !tiene.has(t)));
  });

  /** Documentos de la solicitud; los que el área señaló (o que faltan) van primero y marcados como obligatorios. */
  protected readonly reglas = computed<readonly ReglaDocumentoUploader[]>(() => {
    const p = this.procedimiento().procedimiento;
    const docs = this.catalogo.opciones('documento_radicacion');
    const pedidos = new Set([
      ...p.correcciones.flatMap((c) => docs.filter((d) => d['tipo_doc_warehouse'] === c.documento).map((d) => d.codigo)),
      ...this.faltantes(),
    ]);
    const tipos = [...new Set([...p.documentosRequeridos, ...p.documentos.map((d) => d.tipo)])];
    return tipos
      .sort((a, b) => Number(pedidos.has(b)) - Number(pedidos.has(a)))
      .map((tipo) => ({
        id: tipo,
        etiqueta: this.catalogo.etiqueta('documento_radicacion', tipo),
        descripcion: this.faltantes().has(tipo) ? 'Falta cargar este documento'
          : pedidos.has(tipo) ? 'Te pedimos corregir este documento' : 'Reemplázalo solo si también cambió',
        icono: pedidos.has(tipo) ? 'rule' : 'description',
        obligatorio: pedidos.has(tipo),
      }));
  });

  protected readonly puedeEnviar = computed(() => {
    const cargados = this.cargados();
    if (this.pendienteEnvio()) return [...this.faltantes()].every((t) => cargados[t]);
    return this.procedimiento().procedimiento.estadoPortal === 'EN_CORRECCION' && Object.keys(cargados).length > 0;
  });

  protected onArchivo(evento: ArchivoSeleccionado): void {
    this.archivos.set(evento.id, evento.archivo);
    this.cargados.update((c) => ({ ...c, [evento.id]: evento.archivo.name }));
  }

  protected enviar(): void {
    if (!this.puedeEnviar() || this.enviando()) return;
    this.enviando.set(true);
    this.errorEnvio.set(null);
    const codigo = this.referencia();
    concat(...[...this.archivos].map(([tipo, archivo]) => this.radicacion.subirDocumento(codigo, tipo, archivo)))
      .pipe(
        toArray(),
        switchMap(() => this.pendienteEnvio()
          ? this.radicacion.enviarAlArea(codigo)
          : this.radicacion.reenviarCorreccion(codigo)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.actualizado.set(r);
          this.enviando.set(false);
          this.listo.set(true);
          this.archivos.clear();
          this.cargados.set({});
          this.enviada.emit(r);
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          this.errorEnvio.set(mensajeErrorIntegracion(err));
        },
      });
  }
}
