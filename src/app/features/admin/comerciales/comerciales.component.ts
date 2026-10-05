import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ComercialResponse } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin.service';
import {
  BadgeEstadoComponent,
  IconComponent,
  ModalDialogComponent,
  PageHeaderComponent,
} from '../../../shared/components';

/** Datos del formulario de comercial (contrato real: comercialId, nombre, activo). */
interface FormComercial {
  comercialId: string;
  nombre: string;
  activo: boolean;
  /** `true` cuando se edita un comercial existente (no se cambia el id). */
  readonly edicion: boolean;
}

/**
 * Comerciales (Req 16). El Comercial solo lista su cartera; el Administrador
 * puede registrar o actualizar un comercial (`guardarComercial`).
 *
 * La información proviene del API_Backend de forma asíncrona (`AdminService`).
 * Solo se presentan los campos del `ComercialResponse`.
 */
@Component({
  selector: 'app-admin-comerciales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, BadgeEstadoComponent, ModalDialogComponent, IconComponent],
  templateUrl: './comerciales.component.html',
  styleUrls: ['../admin-comun.scss', './comerciales.component.scss'],
})
export class ComercialesComponent {
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();

  // --- Estado de carga ---
  protected readonly comerciales = signal<readonly ComercialResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  // --- Formulario (solo Administrador) ---
  protected readonly form = signal<FormComercial | null>(null);
  protected readonly errorForm = signal(false);
  protected readonly guardando = signal(false);

  constructor() {
    this.cargarComerciales();
  }

  /** Abre el formulario para registrar un comercial nuevo. */
  protected nuevo(): void {
    this.errorForm.set(false);
    this.form.set({ comercialId: '', nombre: '', activo: true, edicion: false });
  }

  /** Abre el formulario para editar un comercial existente. */
  protected editar(c: ComercialResponse): void {
    this.errorForm.set(false);
    this.form.set({ comercialId: c.comercialId, nombre: c.nombre, activo: c.activo, edicion: true });
  }

  protected cerrarForm(): void {
    this.form.set(null);
  }

  /** Actualiza un campo de texto del formulario. */
  protected actualizarCampo(campo: 'comercialId' | 'nombre', evento: Event): void {
    const f = this.form();
    if (!f) return;
    this.form.set({ ...f, [campo]: (evento.target as HTMLInputElement).value });
  }

  /** Alterna el estado activo del comercial en el formulario. */
  protected alternarActivo(evento: Event): void {
    const f = this.form();
    if (!f) return;
    this.form.set({ ...f, activo: (evento.target as HTMLInputElement).checked });
  }

  /** Registra o actualiza el comercial contra el backend (solo Administrador). */
  protected guardar(): void {
    const f = this.form();
    if (!f) return;
    const comercialId = f.comercialId.trim();
    const nombre = f.nombre.trim();
    if (!comercialId || !nombre) {
      this.errorForm.set(true);
      return;
    }
    this.guardando.set(true);
    this.errorForm.set(false);
    this.admin
      .guardarComercial({ comercialId, nombre, activo: f.activo })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.form.set(null);
          this.cargarComerciales();
        },
        error: () => {
          this.guardando.set(false);
          this.errorForm.set(true);
        },
      });
  }

  /** Obtiene los comerciales visibles según el rol de la sesión. */
  private cargarComerciales(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.admin
      .listarComerciales()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comerciales) => {
          this.comerciales.set(comerciales);
          this.cargando.set(false);
        },
        error: () => {
          this.comerciales.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }
}
