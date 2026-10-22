import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concat, of, switchMap, toArray, type Observable } from 'rxjs';

import type { ProcedimientoResponse } from '../../../../core/services/radicacion.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ConsolaService } from '../../../../core/services/consola.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  FormFieldComponent,
  InfoBoxComponent,
  type ArchivoSeleccionado,
  type ReglaDocumentoUploader,
} from '../../../../shared/components';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';

const SARLAFT = 'formularioSarlaft';

/**
 * «Gestionar» del negocio para el comercial (y el administrador): deja una nota y, según el estado que puso
 * Validación Documental, reemplaza documentos (nunca datos). Recién radicado o en validación solo el SARLAFT; en
 * corrección, cualquiera, y lo devuelve a «Pendiente Validación Documental» con su comentario. El broker lo ve en su
 * historial y el estado cambia también para él.
 */
@Component({
  selector: 'app-gestion-negocio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent, DocUploaderComponent, FormFieldComponent, InfoBoxComponent],
  template: `
    @if (cargando()) {
      <p class="gn__estado" role="status">Cargando la gestión del negocio…</p>
    } @else if (fallo()) {
      <app-alert-banner variante="error" titulo="No pudimos cargar la gestión" icono="error">
        Intenta de nuevo en unos segundos.
      </app-alert-banner>
      <div class="gn__acciones">
        <app-boton variante="outline" icono="refresh" (clicked)="cargar(radicado())">Reintentar</app-boton>
      </div>
    }
    @if (procedimiento(); as p) {
      @switch (modo()) {
        @case ('correccion') {
          <app-alert-banner variante="warning" titulo="Validación Documental pidió corregir" icono="rule">
            <ul class="gn__lista">
              @for (c of p.procedimiento.correcciones; track $index) {
                <li><strong>{{ c.documento }}</strong> — {{ c.observacion }}</li>
              } @empty {
                <li>{{ p.procedimiento.observacion || 'Revisa los documentos cargados.' }}</li>
              }
            </ul>
            Puedes reemplazar los documentos y devolverlo a validación; el broker verá el cambio.
          </app-alert-banner>
        }
        @case ('validacion') {
          <app-info-box icono="hourglass_top">
            <strong>En validación documental.</strong> Mientras el analista no lo revise, puedes reemplazar solo el
            formulario SARLAFT que cargó el broker.
          </app-info-box>
        }
        @default {
          <app-info-box icono="lock">
            En este estado los documentos ya no se pueden cambiar. Puedes dejar una nota en el historial.
          </app-info-box>
        }
      }

      @if (reglas().length) {
        <app-doc-uploader [reglas]="reglas()" [cargados]="cargadosVista()" [disabled]="enviando()" (archivoSeleccionado)="onArchivo($event)" />
      }

      <app-form-field [label]="modo() === 'correccion' ? 'Comentario para el analista y el broker' : 'Nota para el broker'"
        controlId="gn-nota" ayuda="Queda en el historial del negocio y la ve el broker.">
        <textarea id="gn-nota" rows="3" maxlength="500" [value]="nota()" (input)="nota.set(valor($event))"></textarea>
      </app-form-field>

      <div class="gn__acciones">
        @if (modo() === 'correccion') {
          <app-boton variante="accent" icono="send" [disabled]="enviando() || !hayArchivos()" (clicked)="enviarCorreccion()">
            {{ enviando() ? 'Enviando…' : 'Enviar a Pendiente Validación Documental' }}
          </app-boton>
        } @else if (modo() === 'validacion' && hayArchivos()) {
          <app-boton variante="accent" icono="upload_file" [disabled]="enviando()" (clicked)="reemplazar()">
            {{ enviando() ? 'Guardando…' : 'Reemplazar SARLAFT' }}
          </app-boton>
        }
        <app-boton variante="outline" icono="edit_note" [disabled]="enviando() || !nota().trim()" (clicked)="guardarNota()">
          Guardar nota
        </app-boton>
      </div>
    }
  `,
  styles: [
    `
      :host { display: flex; flex-direction: column; gap: var(--space-4); }
      .gn__lista { margin: 0 0 var(--space-2); padding-left: var(--space-5); }
      .gn__estado { margin: 0; color: var(--color-muted); }
      .gn__acciones { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); }
      textarea { width: 100%; }
    `,
  ],
})
export class GestionNegocioComponent {
  private readonly consola = inject(ConsolaService);
  private readonly catalogo = inject(CatalogoService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly radicado = input.required<string>();
  /** El negocio cambió (nota, documento o reenvío): el contenedor recarga el detalle. */
  readonly actualizado = output<void>();

  protected readonly procedimiento = signal<ProcedimientoResponse | null>(null);
  protected readonly nota = signal('');
  protected readonly enviando = signal(false);
  protected readonly cargando = signal(false);
  protected readonly fallo = signal(false);
  private readonly archivos = new Map<string, File>();
  private readonly elegidos = signal<Readonly<Record<string, string>>>({});

  constructor() {
    effect(() => this.cargar(this.radicado()));
  }

  /** Auditoría de producción CM4: mientras llega, se dice que está cargando; si falla, se ofrece reintentar. */
  protected cargar(codigo: string): void {
    this.cargando.set(true);
    this.fallo.set(false);
    this.consola.procedimientoNegocio(codigo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => {
        this.procedimiento.set(p);
        this.cargando.set(false);
      },
      error: () => {
        this.procedimiento.set(null);
        this.cargando.set(false);
        this.fallo.set(true);
      },
    });
  }

  /** Qué permite el estado: corrección (todo), validación (solo SARLAFT) o solo notas. */
  protected readonly modo = computed<'correccion' | 'validacion' | 'nota'>(() => {
    const estado = this.procedimiento()?.procedimiento.estadoPortal;
    return estado === 'EN_CORRECCION' ? 'correccion' : estado === 'RADICADA' || estado === 'EN_GESTION' ? 'validacion' : 'nota';
  });

  protected readonly reglas = computed<readonly ReglaDocumentoUploader[]>(() => {
    const p = this.procedimiento()?.procedimiento;
    if (!p || this.modo() === 'nota') return [];
    const docs = this.catalogo.opciones('documento_radicacion');
    const pedidos = new Set(p.correcciones.flatMap((c) => docs.filter((d) => d['tipo_doc_warehouse'] === c.documento).map((d) => d.codigo)));
    const tipos = this.modo() === 'validacion' ? [SARLAFT]
      : [...new Set([...p.documentosRequeridos, ...p.documentos.map((d) => d.tipo)])].sort((a, b) => Number(pedidos.has(b)) - Number(pedidos.has(a)));
    return tipos.map((tipo) => ({
      id: tipo,
      etiqueta: this.catalogo.etiqueta('documento_radicacion', tipo),
      descripcion: pedidos.has(tipo) ? 'El analista pidió corregir este documento' : 'Reemplázalo solo si cambió',
      icono: pedidos.has(tipo) ? 'rule' : 'description',
      obligatorio: pedidos.has(tipo),
    }));
  });

  protected readonly cargadosVista = computed<Readonly<Record<string, string>>>(() => {
    const servidor = Object.fromEntries((this.procedimiento()?.procedimiento.documentos ?? []).map((d) => [d.tipo, d.nombre]));
    return { ...servidor, ...this.elegidos() };
  });

  protected readonly hayArchivos = computed(() => Object.keys(this.elegidos()).length > 0);

  protected valor(e: Event): string {
    return (e.target as HTMLTextAreaElement).value;
  }

  protected onArchivo(e: ArchivoSeleccionado): void {
    this.archivos.set(e.id, e.archivo);
    this.elegidos.update((c) => ({ ...c, [e.id]: e.archivo.name }));
  }

  private subirElegidos(): Observable<unknown> {
    const codigo = this.radicado();
    const subidas = [...this.archivos].map(([tipo, archivo]) => this.consola.subirDocumentoNegocio(codigo, tipo, archivo));
    return subidas.length ? concat(...subidas).pipe(toArray()) : of([]);
  }

  protected reemplazar(): void {
    this.ejecutar(this.subirElegidos(), 'Documento reemplazado. El analista lo verá en la revisión.');
  }

  protected enviarCorreccion(): void {
    this.ejecutar(this.subirElegidos().pipe(switchMap(() => this.consola.reenviarCorreccionNegocio(this.radicado(), this.nota()))),
      'Corrección enviada: el negocio volvió a «Pendiente Validación Documental».');
  }

  protected guardarNota(): void {
    this.ejecutar(this.consola.dejarNota(this.radicado(), this.nota()), 'Nota enviada: el broker la ve en el historial de su solicitud.');
  }

  private ejecutar(accion: Observable<unknown>, mensaje: string): void {
    if (this.enviando()) return;
    this.enviando.set(true);
    accion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enviando.set(false);
        this.archivos.clear();
        this.elegidos.set({});
        this.nota.set('');
        this.feedback.toast({ variante: 'exito', mensaje });
        this.consola.procedimientoNegocio(this.radicado()).subscribe({ next: (p) => this.procedimiento.set(p) });
        this.actualizado.emit();
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
      },
    });
  }
}
