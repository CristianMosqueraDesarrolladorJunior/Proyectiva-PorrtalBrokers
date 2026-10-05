import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ComercialResumen } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin.service';
import { copCompacto, pendientes } from '../../../core/services/admin.helpers';
import {
  BadgeEstadoComponent,
  IconComponent,
  ModalDialogComponent,
  PageHeaderComponent,
} from '../../../shared/components';

/** Formulario de comercial: nuevo (`id` null) o acceso para uno existente. */
interface FormComercial {
  readonly id: string | null;
  nombre: string;
  cedula: string;
  correo: string;
}

/**
 * Comerciales (solo Administrador): cartera y producción de cada uno, creación
 * de comerciales y de su usuario, clave temporal, activar/desactivar.
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
  private readonly router = inject(Router);

  protected readonly comerciales = computed(() => this.admin.comercialesResumen());

  protected readonly form = signal<FormComercial | null>(null);
  protected readonly errorForm = signal('');
  /** Clave temporal recién generada: se muestra una sola vez. */
  protected readonly claveMostrada = signal<{ nombre: string; cedula: string; clave: string } | null>(null);
  protected readonly copiado = signal(false);
  protected readonly confirmarRestaurar = signal(false);

  protected readonly copCompacto = copCompacto;
  protected readonly pendientes = pendientes;

  protected num(n: number): string {
    return n.toLocaleString('es-CO');
  }

  protected nuevo(): void {
    this.errorForm.set('');
    this.form.set({ id: null, nombre: '', cedula: '', correo: '' });
  }

  protected crearAcceso(c: ComercialResumen): void {
    this.errorForm.set('');
    this.form.set({ id: c.id, nombre: c.nombre, cedula: c.cedula ?? '', correo: c.correo ?? '' });
  }

  protected actualizarCampo(campo: 'nombre' | 'cedula' | 'correo', evento: Event): void {
    const f = this.form();
    if (!f) return;
    let valor = (evento.target as HTMLInputElement).value;
    if (campo === 'cedula') valor = valor.replace(/\D/g, '').slice(0, 10);
    this.form.set({ ...f, [campo]: valor });
  }

  protected guardar(): void {
    const f = this.form();
    if (!f) return;
    const datos = { nombre: f.nombre, cedula: f.cedula, correo: f.correo };
    const r = f.id === null ? this.admin.crearComercial(datos) : this.admin.crearAcceso(f.id, datos);
    if ('error' in r) {
      this.errorForm.set(r.error);
      return;
    }
    this.form.set(null);
    this.copiado.set(false);
    this.claveMostrada.set({ nombre: f.nombre.trim(), cedula: f.cedula, clave: r.clave });
  }

  protected restablecer(c: ComercialResumen): void {
    const clave = this.admin.restablecerClave(c.id);
    if (clave) {
      this.copiado.set(false);
      this.claveMostrada.set({ nombre: c.nombre, cedula: c.cedula ?? '', clave });
    }
  }

  protected alternarActivo(c: ComercialResumen): void {
    this.admin.alternarActivo(c.id);
  }

  protected verBrokers(c: ComercialResumen): void {
    void this.router.navigate(['/admin/brokers'], { queryParams: { comercial: c.id } });
  }

  protected copiarClave(): void {
    const c = this.claveMostrada();
    if (!c) return;
    const texto = `Consola Proyectiva\nUsuario (cédula): ${c.cedula}\nClave temporal: ${c.clave}`;
    navigator.clipboard?.writeText(texto).then(
      () => this.copiado.set(true),
      () => this.copiado.set(false),
    );
  }

  protected restaurar(): void {
    this.admin.restaurarDemo();
    this.confirmarRestaurar.set(false);
  }
}
