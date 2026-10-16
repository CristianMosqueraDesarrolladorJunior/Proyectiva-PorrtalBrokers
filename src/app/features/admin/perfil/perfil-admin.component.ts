import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { fechaHora } from '../../../core/services/admin.helpers';
import { AuthService } from '../../../core/services/auth.service';
import { MiPerfilService, type CambiosPerfil, type PerfilInterno } from '../../../core/services/mi-perfil.service';
import { SessionService } from '../../../core/services/session.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BotonComponent,
  EstadoVistaComponent,
  FormClaveComponent,
  FormFieldComponent,
  FotoPerfilComponent,
  IconComponent,
  PageHeaderComponent,
  type CambioClave,
} from '../../../shared/components';
import { SoloDigitosDirective } from '../../../shared/directives/solo-digitos.directive';

type Campo = keyof CambiosPerfil;

/**
 * Mi perfil del Administrador y del Comercial: foto, datos personales y laborales, y cambio de
 * contraseña. Todo sale de la sesión; nadie edita el perfil de otro.
 */
@Component({
  selector: 'app-perfil-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SoloDigitosDirective, 
    AlertBannerComponent,
    BadgeEstadoComponent,
    BotonComponent,
    EstadoVistaComponent,
    FormClaveComponent,
    FormFieldComponent,
    FotoPerfilComponent,
    IconComponent,
    PageHeaderComponent,
  ],
  templateUrl: './perfil-admin.component.html',
  styleUrls: ['../admin-comun.scss', './perfil-admin.component.scss'],
})
export class PerfilAdminComponent implements OnInit {
  private readonly miPerfil = inject(MiPerfilService);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(FormClaveComponent) private formClave?: FormClaveComponent;

  protected readonly fechaHora = fechaHora;
  protected readonly foto = this.miPerfil.foto;
  protected readonly esComercial = computed(() => this.session.perfil()?.rol === 'COMERCIAL');

  protected readonly perfil = signal<PerfilInterno | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly form = signal<CambiosPerfil>({ nombre: '', documento: null, telefono: null, cargo: null, area: null, ciudad: null });
  protected readonly guardando = signal(false);
  protected readonly mensaje = signal('');
  protected readonly errorDatos = signal('');

  protected readonly subiendoFoto = signal(false);
  protected readonly errorFoto = signal('');

  protected readonly cambiandoClave = signal(false);
  protected readonly errorClave = signal('');
  protected readonly claveCambiada = signal(false);

  /** Porcentaje del perfil diligenciado: invita a completar los datos de contacto. */
  protected readonly completitud = computed(() => {
    const f = this.form();
    const campos = [f.nombre, f.documento, f.telefono, f.cargo, f.area, f.ciudad];
    return Math.round((campos.filter((c) => !!c && String(c).trim()).length / campos.length) * 100);
  });

  protected readonly cambios = computed(() => {
    const p = this.perfil();
    const f = this.form();
    if (!p) return false;
    return (Object.keys(f) as Campo[]).some((k) => (f[k] ?? '') !== (p[k] ?? ''));
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.miPerfil
      .perfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.ponerPerfil(p);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.error.set(mensajeErrorIntegracion(err));
          this.cargando.set(false);
        },
      });
  }

  protected valor(campo: Campo): string {
    return this.form()[campo] ?? '';
  }

  protected poner(campo: Campo, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, [campo]: campo === 'nombre' ? valor : valor || null }));
    this.mensaje.set('');
  }

  protected descartar(): void {
    const p = this.perfil();
    if (p) this.ponerPerfil(p);
  }

  protected guardar(): void {
    this.errorDatos.set('');
    this.mensaje.set('');
    if (!this.form().nombre.trim()) {
      this.errorDatos.set('El nombre es obligatorio.');
      return;
    }
    this.guardando.set(true);
    this.miPerfil
      .actualizar(this.form())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.ponerPerfil(p);
          this.guardando.set(false);
          this.mensaje.set('Tus datos quedaron actualizados.');
          const sesion = this.session.perfil();
          if (sesion) this.session.establecerPerfil({ ...sesion, nombre: p.nombre });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorDatos.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected subirFoto(archivo: File): void {
    this.errorFoto.set('');
    this.subiendoFoto.set(true);
    this.miPerfil
      .subirFoto(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.subiendoFoto.set(false),
        error: (err: unknown) => {
          this.subiendoFoto.set(false);
          this.errorFoto.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected quitarFoto(): void {
    this.errorFoto.set('');
    this.subiendoFoto.set(true);
    this.miPerfil
      .quitarFoto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.subiendoFoto.set(false),
        error: (err: unknown) => {
          this.subiendoFoto.set(false);
          this.errorFoto.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected cambiarClave(cambio: CambioClave): void {
    this.errorClave.set('');
    this.claveCambiada.set(false);
    this.cambiandoClave.set(true);
    this.auth
      .cambiarClave(cambio.actual, cambio.nueva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cambiandoClave.set(false);
          this.claveCambiada.set(true);
          this.formClave?.reiniciar();
        },
        error: (err: unknown) => {
          this.cambiandoClave.set(false);
          this.errorClave.set(mensajeErrorIntegracion(err));
        },
      });
  }

  private ponerPerfil(p: PerfilInterno): void {
    this.perfil.set(p);
    this.form.set({ nombre: p.nombre, documento: p.documento, telefono: p.telefono, cargo: p.cargo, area: p.area, ciudad: p.ciudad });
  }
}
