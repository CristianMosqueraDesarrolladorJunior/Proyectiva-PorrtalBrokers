import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ConsolaService } from '../../../../core/services/consola.service';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';
import { BotonComponent } from '../../../../shared/components/boton/boton.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { VisorArchivoComponent } from '../../../../shared/components/visor-archivo/visor-archivo.component';

interface DocumentoVista {
  readonly tipo: string;
  readonly etiqueta: string;
  readonly nombre: string;
}

/**
 * Documentos que el broker cargó en un negocio, con vista previa (PDF o imagen) para el administrador y el comercial.
 * Solo lectura: el reemplazo de documentos sigue en la pestaña «Gestionar».
 */
@Component({
  selector: 'app-documentos-negocio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent, EmptyStateComponent, SkeletonComponent, VisorArchivoComponent],
  template: `
    @if (cargando()) {
      <app-skeleton [lineas]="3" ariaLabel="Cargando documentos" />
    } @else if (error()) {
      <app-alert-banner variante="error" titulo="No pudimos cargar los documentos" icono="error">
        Intenta de nuevo en un momento.
      </app-alert-banner>
    } @else if (!documentos().length) {
      <app-empty-state icono="folder_off" titulo="Sin documentos"
        descripcion="Este negocio todavía no tiene documentos cargados." />
    } @else {
      <ul class="dn__lista">
        @for (d of documentos(); track d.tipo) {
          <li>
            <app-boton [variante]="activo()?.tipo === d.tipo ? 'accent' : 'outline'" icono="description" (clicked)="ver(d)">
              {{ d.etiqueta }}
            </app-boton>
          </li>
        }
      </ul>
      @if (activo(); as a) {
        @if (errorArchivo()) {
          <app-alert-banner variante="error" titulo="No pudimos abrir este documento" icono="error">
            Puede que el archivo ya no esté disponible.
          </app-alert-banner>
        } @else {
          <app-visor-archivo [archivo]="archivo()" [cargando]="cargandoArchivo()" [nombre]="a.nombre" />
        }
      } @else {
        <p class="dn__ayuda">Elige un documento para verlo aquí.</p>
      }
    }
  `,
  styles: [
    `
      .dn__lista { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; padding: 0; margin: 0 0 var(--space-3); }
      .dn__ayuda { color: var(--sb-secondary); font-size: var(--text-caption); }
    `,
  ],
})
export class DocumentosNegocioComponent implements OnInit {
  private readonly consola = inject(ConsolaService);
  private readonly catalogo = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly radicado = input.required<string>();

  protected readonly documentos = signal<readonly DocumentoVista[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly activo = signal<DocumentoVista | null>(null);
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);
  protected readonly errorArchivo = signal(false);

  ngOnInit(): void {
    this.consola.procedimientoNegocio(this.radicado()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.documentos.set(r.procedimiento.documentos.map((d) => ({
          tipo: d.tipo,
          etiqueta: this.catalogo.etiqueta('documento_radicacion', d.tipo),
          nombre: d.nombre,
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  protected ver(d: DocumentoVista): void {
    this.activo.set(d);
    this.archivo.set(null);
    this.errorArchivo.set(false);
    this.cargandoArchivo.set(true);
    this.consola.documentoNegocioArchivo(this.radicado(), d.tipo)
      .pipe(finalize(() => this.cargandoArchivo.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (b) => this.archivo.set(b), error: () => this.errorArchivo.set(true) });
  }
}
