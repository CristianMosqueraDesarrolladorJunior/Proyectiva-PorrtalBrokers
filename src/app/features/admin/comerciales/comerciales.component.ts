import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

import type { ComercialConsola, CredencialGenerada, PersonaRequest } from '../../../core/models/consola.model';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaHora } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BotonComponent,
  CredencialUnicaComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, SeccionFicha, Tab } from '../../../shared/components';
import { FormPersonaComponent } from '../componentes/form-persona.component';

/**
 * Comerciales (solo Administrador): alta con credenciales generadas, cartera (brokers, prospectos,
 * negocios, pólizas, ingreso y comisión) y un único botón por fila para editar, gestionar el acceso
 * y activar o desactivar.
 */
@Component({
  selector: 'app-admin-comerciales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BadgeEstadoComponent,
    BotonComponent,
    CredencialUnicaComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FormFieldComponent,
    FormPersonaComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
  ],
  templateUrl: './comerciales.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class ComercialesComponent {
  private readonly consola = inject(ConsolaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly compacto = copCompacto;

  protected readonly comerciales = signal<readonly ComercialConsola[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly mensaje = signal('');

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'comercial', header: 'Comercial', tipo: 'principal', ordenable: true },
    { key: 'contacto', header: 'Contacto', tipo: 'principal' },
    { key: 'usuario', header: 'Usuario de acceso' },
    { key: 'cartera', header: 'Brokers · prospectos', alinear: 'derecha', ordenable: true },
    { key: 'negocios', header: 'Negocios · pólizas', alinear: 'derecha', ordenable: true },
    { key: 'ingreso', header: 'Ingreso', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'Comisión de la cartera', alinear: 'derecha', ordenable: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.comerciales().map((c) => ({
      comercial: c.nombre,
      comercialSub: `${c.codigo}${c.documento ? ' · CC ' + c.documento : ''}`,
      contacto: c.correo ?? '—',
      contactoSub: c.telefono ?? '',
      usuario: c.usuario ?? 'Sin acceso',
      cartera: `${c.brokers} · ${c.prospectos}`,
      carteraOrden: c.brokers + c.prospectos,
      negocios: `${c.negocios} · ${c.polizas}`,
      negociosOrden: c.negocios,
      ingreso: cop(c.primas),
      ingresoOrden: c.primas,
      comision: cop(c.comision),
      comisionOrden: c.comision,
      estado: c.activo ? 'Activo' : 'Inactivo',
      estadoVariante: c.activo ? 'success' : 'danger',
      ...celdasFechas(c.creado, c.ultimoMovimiento),
      gestionar: '',
    })),
  );

  protected readonly activos = computed(() => this.comerciales().filter((c) => c.activo).length);
  protected readonly totalBrokers = computed(() => this.comerciales().reduce((t, c) => t + c.brokers, 0));
  protected readonly totalIngreso = computed(() => this.comerciales().reduce((t, c) => t + c.primas, 0));

  // --- Alta ---
  protected readonly creando = signal(false);
  protected readonly enviandoAlta = signal(false);
  protected readonly errorAlta = signal('');
  protected readonly credencial = signal<CredencialGenerada | null>(null);

  // --- Operación ---
  protected readonly seleccionado = signal<ComercialConsola | null>(null);
  protected readonly pestana = signal('detalle');
  protected readonly pestanas: readonly Tab[] = [
    { id: 'detalle', etiqueta: 'Detalle' },
    { id: 'editar', etiqueta: 'Editar datos' },
    { id: 'acceso', etiqueta: 'Acceso' },
  ];
  protected readonly nombre = signal('');
  protected readonly correo = signal('');
  protected readonly telefono = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorAccion = signal('');
  protected readonly credencialNueva = signal<CredencialGenerada | null>(null);

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const c = this.seleccionado();
    if (!c) return [];
    return [
      {
        titulo: 'Datos del comercial',
        icono: 'badge',
        datos: [
          { etiqueta: 'Nombre', valor: c.nombre },
          { etiqueta: 'Código', valor: c.codigo },
          { etiqueta: 'Cédula', valor: c.documento },
          { etiqueta: 'Correo', valor: c.correo },
          { etiqueta: 'Teléfono', valor: c.telefono },
          { etiqueta: 'Usuario de acceso', valor: c.usuario ?? 'Sin acceso' },
          { etiqueta: 'Estado', valor: c.activo ? 'Activo' : 'Inactivo' },
        ],
      },
      {
        titulo: 'Cartera asignada',
        icono: 'work',
        datos: [
          { etiqueta: 'Brokers registrados', valor: c.brokers },
          { etiqueta: 'Prospectos', valor: c.prospectos },
          { etiqueta: 'Negocios', valor: c.negocios },
          { etiqueta: 'Pólizas expedidas', valor: c.polizas },
          { etiqueta: 'Ingreso al negocio', valor: cop(c.primas) },
          { etiqueta: 'Comisión de sus brokers', valor: cop(c.comision), destacado: true },
          { etiqueta: 'Creado', valor: fechaHora(c.creado) },
          { etiqueta: 'Último movimiento', valor: fechaHora(c.ultimoMovimiento ?? c.creado) },
        ],
      },
    ];
  });

  protected readonly datosValidos = computed(
    () =>
      this.nombre().trim().length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo().trim()) &&
      /^\d{7,10}$/.test(this.telefono().trim()),
  );

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.consola
      .comerciales()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.comerciales.set(c);
          this.cargando.set(false);
        },
        error: () => {
          this.comerciales.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected v(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  // --- Alta ---
  protected abrirAlta(): void {
    this.creando.set(true);
    this.credencial.set(null);
    this.errorAlta.set('');
  }

  protected crear(datos: PersonaRequest): void {
    this.enviandoAlta.set(true);
    this.errorAlta.set('');
    this.consola
      .crearComercial(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alta) => {
          this.enviandoAlta.set(false);
          this.credencial.set(alta.credencial);
          this.mensaje.set(`Comercial ${datos.nombre} creado (${alta.codigo}); entra a la rotación de prospectos.`);
          this.cargar();
        },
        error: (err: unknown) => {
          this.enviandoAlta.set(false);
          this.errorAlta.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected cerrarAlta(): void {
    this.creando.set(false);
    this.credencial.set(null);
  }

  // --- Operación ---
  protected gestionar(evento: AccionFila): void {
    const c = this.comerciales().at(evento.indice);
    if (!c) return;
    this.seleccionado.set(c);
    this.pestana.set('detalle');
    this.nombre.set(c.nombre);
    this.correo.set(c.correo ?? '');
    this.telefono.set(c.telefono ?? '');
    this.errorAccion.set('');
    this.credencialNueva.set(null);
  }

  protected guardarDatos(): void {
    const c = this.seleccionado();
    if (!c || !this.datosValidos()) return;
    this.ejecutar(
      this.consola.actualizarComercial(c.codigo, {
        nombre: this.nombre().trim(),
        correo: this.correo().trim(),
        telefono: this.telefono().trim(),
      }),
      `Datos de ${this.nombre().trim()} actualizados.`,
    );
  }

  protected cambiarActivo(): void {
    const c = this.seleccionado();
    if (!c) return;
    this.ejecutar(this.consola.activarComercial(c.codigo, !c.activo),
      c.activo ? `${c.nombre} quedó inactivo: sale de la rotación y pierde el acceso.` : `${c.nombre} quedó activo.`);
  }

  protected restablecerAcceso(): void {
    const c = this.seleccionado();
    if (!c) return;
    this.guardando.set(true);
    this.errorAccion.set('');
    this.consola
      .restablecerAccesoComercial(c.codigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cred) => {
          this.guardando.set(false);
          this.credencialNueva.set(cred);
          this.cargar();
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorAccion.set(mensajeErrorIntegracion(err));
        },
      });
  }

  private ejecutar(accion: Observable<unknown>, exito: string): void {
    this.guardando.set(true);
    this.errorAccion.set('');
    accion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.seleccionado.set(null);
        this.mensaje.set(exito);
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorAccion.set(mensajeErrorIntegracion(err));
      },
    });
  }
}
