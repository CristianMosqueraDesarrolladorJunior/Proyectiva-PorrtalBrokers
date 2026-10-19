import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import type { LecturaContratoResponse } from '../../../../core/models/contrato.model';
import type { ParteInduccion } from '../../../../core/models/renovacion.model';
import { RenovacionService, type RenovacionResponse } from '../../../../core/services/renovacion.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  FormFieldComponent,
  FormSectionCardComponent,
  LayoutResumenComponent,
  PageHeaderComponent,
  SuccessScreenComponent,
  SummaryCardComponent,
  ToggleSwitchComponent,
} from '../../../../shared/components';
import type {
  ArchivoSeleccionado,
  FilaResumen,
  ReglaDocumentoUploader,
  TarjetaSeguimiento,
} from '../../../../shared/components';
import { LectorContratoComponent } from '../../../contrato/components/lector-contrato/lector-contrato.component';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import {
  ETIQUETA_PARTE,
  PARTE_VACIA,
  partesDesdeLectura,
  revisarInduccion,
  revisarParte,
  type ClaveParte,
} from '../../induccion-habilitacion';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';

/**
 * Inducción de una póliza ya vencida: contrato (con lectura inteligente que precarga las partes),
 * datos de propietario, inquilino y deudor solidario, y paz y salvo. El backend guarda los archivos
 * en GCS privado y avisa al área por correo con enlaces (sin adjuntos).
 */
@Component({
  selector: 'app-induccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BotonComponent,
    DocUploaderComponent,
    FormFieldComponent,
    FormSectionCardComponent,
    LayoutResumenComponent,
    LectorContratoComponent,
    PageHeaderComponent,
    SuccessScreenComponent,
    SummaryCardComponent,
    ToggleSwitchComponent,
  ],
  templateUrl: './induccion.component.html',
  styleUrl: './induccion.component.scss',
})
export class InduccionComponent {
  private readonly feedback = inject(FeedbackService);
  private readonly renovaciones = inject(RenovacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly numeroPoliza = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((p) => (p.get('poliza') ?? '').trim().replace(/^#/, ''))),
    { initialValue: '' },
  );

  /** Tipos de identificación (catálogo `tipo_documento`). */
  protected readonly tiposIdentificacion = inject(CatalogoService)
    .opciones('tipo_documento')
    .filter((t) => t['propietario'] === true)
    .map((t) => ({ valor: t.codigo, etiqueta: t.descripcion }));
  protected readonly etiquetaParte = ETIQUETA_PARTE;

  protected readonly partes = signal<Readonly<Record<ClaveParte, ParteInduccion>>>({
    propietario: PARTE_VACIA,
    inquilino: PARTE_VACIA,
    deudorSolidario: PARTE_VACIA,
  });
  protected readonly conDeudor = signal(true);
  protected readonly clavesVisibles = computed<readonly ClaveParte[]>(() =>
    this.conDeudor() ? ['propietario', 'inquilino', 'deudorSolidario'] : ['propietario', 'inquilino'],
  );

  protected readonly contrato = signal<File | null>(null);
  protected readonly pazYSalvo = signal<File | null>(null);
  protected readonly observaciones = signal('');
  protected readonly precargado = signal(false);

  protected readonly reglaPazYSalvo: readonly ReglaDocumentoUploader[] = [
    {
      id: 'paz-y-salvo',
      etiqueta: 'Paz y salvo del inquilino',
      descripcion: 'Expedido por la inmobiliaria o el propietario (PDF, JPG, PNG · máx. 10MB)',
      icono: 'verified',
      obligatorio: true,
    },
  ];
  protected readonly cargadosPazYSalvo = computed<Readonly<Record<string, string>>>(() => {
    const archivo = this.pazYSalvo();
    const cargados: Record<string, string> = {};
    if (archivo) cargados['paz-y-salvo'] = archivo.name;
    return cargados;
  });

  protected readonly intento = signal(false);
  protected readonly enviando = signal(false);
  protected readonly confirmacion = signal<RenovacionResponse | null>(null);

  protected readonly errores = computed(() =>
    revisarInduccion(this.partes(), this.conDeudor(), this.contrato() !== null, this.pazYSalvo() !== null),
  );

  protected readonly resumen = computed<readonly FilaResumen[]>(() => {
    const listo = (ok: boolean) => (ok ? 'Listo' : 'Pendiente');
    const filas: FilaResumen[] = [{ label: 'Contrato', valor: listo(this.contrato() !== null) }];
    for (const clave of this.clavesVisibles()) {
      filas.push({ label: ETIQUETA_PARTE[clave], valor: listo(revisarParte(clave, this.partes()[clave]).length === 0) });
    }
    filas.push({ label: 'Paz y salvo', valor: listo(this.pazYSalvo() !== null) });
    return filas;
  });

  protected readonly avance = computed(() => {
    const filas = this.resumen();
    return { label: 'Avance', valor: `${filas.filter((f) => f.valor === 'Listo').length} de ${filas.length}` };
  });

  protected readonly tarjetasExito = computed<readonly TarjetaSeguimiento[]>(() => [
    { etiqueta: 'RADICADO', valor: this.confirmacion()?.radicado ?? '—' },
    { etiqueta: 'ESTADO', valor: this.confirmacion()?.estado ?? '—' },
    { etiqueta: 'PÓLIZA', valor: `#${this.numeroPoliza()}` },
  ]);

  protected actualizarParte(clave: ClaveParte, campo: keyof ParteInduccion, valor: string): void {
    this.partes.update((p) => ({ ...p, [clave]: { ...p[clave], [campo]: valor } }));
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected errorDe(clave: ClaveParte, texto: string): string {
    if (!this.intento()) return '';
    return revisarParte(clave, this.partes()[clave]).some((e) => e.includes(texto)) ? `Revisa ${texto}.` : '';
  }

  protected onLectura(lectura: LecturaContratoResponse): void {
    this.partes.update((actuales) => partesDesdeLectura(actuales, lectura));
    if (lectura.deudorSolidario?.nombres) this.conDeudor.set(true);
    this.precargado.set(true);
  }

  protected onPazYSalvo(evento: ArchivoSeleccionado): void {
    this.pazYSalvo.set(evento.archivo);
  }

  protected enviar(): void {
    this.intento.set(true);
    const contrato = this.contrato();
    const pazYSalvo = this.pazYSalvo();
    if (this.errores().length > 0 || !contrato || !pazYSalvo || this.enviando()) return;
    const p = this.partes();
    this.enviando.set(true);
    this.renovaciones
      .enviarInduccion(
        this.numeroPoliza(),
        {
          propietario: p.propietario,
          inquilino: p.inquilino,
          deudorSolidario: this.conDeudor() ? p.deudorSolidario : undefined,
          observaciones: this.observaciones().trim() || undefined,
        },
        contrato,
        pazYSalvo,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.enviando.set(false);
          this.confirmacion.set(respuesta);
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          this.feedback.error({ titulo: 'No se pudo enviar', mensaje: mensajeErrorIntegracion(err) });
        },
      });
  }

  protected volver(): void {
    void this.router.navigate(['/app/renovaciones']);
  }
}
