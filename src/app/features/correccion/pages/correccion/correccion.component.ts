import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { concat, switchMap, toArray } from 'rxjs';

import { RadicacionService, type ProcedimientoResponse } from '../../../../core/services/radicacion.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  EstadoVistaComponent,
  IconComponent,
  PageHeaderComponent,
  type ArchivoSeleccionado,
  type ReglaDocumentoUploader,
} from '../../../../shared/components';
import { CatalogoService } from '../../../../core/services/catalogo.service';


/**
 * Corrección documental pedida por el área en el Warehouse (estado "Pendiente Corrección Documental"): muestra
 * qué corregir, recibe los documentos nuevos y devuelve la solicitud a "Pendiente Validación Documental".
 */
@Component({
  selector: 'app-correccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent, DocUploaderComponent, EstadoVistaComponent, IconComponent, PageHeaderComponent],
  templateUrl: './correccion.component.html',
  styleUrl: './correccion.component.scss',
})
export class CorreccionComponent {
  private readonly radicacion = inject(RadicacionService);
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly referencia = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('referencia')?.trim() ?? '');
  protected readonly datos = signal<ProcedimientoResponse | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal('');
  protected readonly listo = signal(false);

  private readonly archivos = new Map<string, File>();
  protected readonly cargados = signal<Readonly<Record<string, string>>>({});

  /** Documentos de la solicitud; los que el área señaló van primero y marcados como obligatorios. */
  protected readonly reglas = computed<readonly ReglaDocumentoUploader[]>(() => {
    const p = this.datos()?.procedimiento;
    if (!p) return [];
    const docs = this.catalogo.opciones('documento_radicacion');
    const pedidos = new Set(
      p.correcciones.flatMap((c) => docs.filter((d) => d['tipo_doc_warehouse'] === c.documento).map((d) => d.codigo)),
    );
    const tipos = [...new Set([...p.documentosRequeridos, ...p.documentos.map((d) => d.tipo)])];
    return tipos
      .sort((a, b) => Number(pedidos.has(b)) - Number(pedidos.has(a)))
      .map((tipo) => ({
        id: tipo,
        etiqueta: this.catalogo.etiqueta('documento_radicacion', tipo),
        descripcion: pedidos.has(tipo) ? 'El área pidió corregir este documento' : 'Reemplázalo solo si también cambió',
        icono: pedidos.has(tipo) ? 'rule' : 'description',
        obligatorio: pedidos.has(tipo),
      }));
  });

  protected readonly puedeEnviar = computed(
    () => this.datos()?.procedimiento.estadoPortal === 'EN_CORRECCION' && Object.keys(this.cargados()).length > 0,
  );

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    if (!this.referencia()) {
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.error.set(false);
    this.radicacion
      .procedimiento(this.referencia())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.datos.set(r);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set(true);
          this.cargando.set(false);
        },
      });
  }

  protected onArchivo(evento: ArchivoSeleccionado): void {
    this.archivos.set(evento.id, evento.archivo);
    this.cargados.update((c) => ({ ...c, [evento.id]: evento.archivo.name }));
    this.errorEnvio.set('');
  }

  protected enviar(): void {
    if (!this.puedeEnviar() || this.enviando()) return;
    this.enviando.set(true);
    this.errorEnvio.set('');
    const codigo = this.referencia();
    concat(...[...this.archivos].map(([tipo, archivo]) => this.radicacion.subirDocumento(codigo, tipo, archivo)))
      .pipe(
        toArray(),
        switchMap(() => this.radicacion.reenviarCorreccion(codigo)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.datos.set(r);
          this.enviando.set(false);
          this.listo.set(true);
          this.archivos.clear();
          this.cargados.set({});
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          this.errorEnvio.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected volver(): void {
    void this.router.navigate(['/app/seguimiento']);
  }
}
