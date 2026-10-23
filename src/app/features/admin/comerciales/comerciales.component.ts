import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

import type { ComercialConsola, CredencialGenerada, PersonaRequest, RendimientoConsola } from '../../../core/models/consola.model';
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
import { FormPersonaComponent, porcentajeValido } from '../componentes/form-persona.component';
import { switchMap } from 'rxjs';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

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
  private readonly feedback = inject(FeedbackService);
  private readonly consola = inject(ConsolaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly compacto = copCompacto;

  protected readonly comerciales = signal<readonly ComercialConsola[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'comercial', header: 'Comercial', tipo: 'principal', ordenable: true },
    { key: 'contacto', header: 'Contacto', tipo: 'principal' },
    { key: 'usuario', header: 'Usuario de acceso' },
    { key: 'cartera', header: 'Brokers · prospectos', alinear: 'derecha', ordenable: true },
    { key: 'negocios', header: 'Negocios · pólizas', alinear: 'derecha', ordenable: true },
    { key: 'ingreso', header: 'Ingreso', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'Comisión en cuentas de cobro', alinear: 'derecha', ordenable: true, nowrap: true },
    { key: 'porcentaje', header: 'Comisión del comercial', alinear: 'derecha', ordenable: true },
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
      porcentaje: `${c.porcentajeComision ?? 0} %`,
      porcentajeOrden: c.porcentajeComision ?? 0,
      estado: !c.activo ? 'Inactivo' : c.enVacaciones ? 'En vacaciones' : 'Activo',
      estadoVariante: !c.activo ? 'danger' : c.enVacaciones ? 'warning' : 'success',
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
  protected readonly porcentaje = signal('0');
  protected readonly guardando = signal(false);
  protected readonly credencialNueva = signal<CredencialGenerada | null>(null);

  /** Rendimiento del equipo (arriba) y del comercial abierto (sección del modal). */
  protected readonly rendimientoEquipo = signal<RendimientoConsola | null>(null);
  protected readonly rendimientoComercial = signal<RendimientoConsola | null>(null);
  protected pct(a: number, b: number): number {
    return b ? Math.round((a / b) * 100) : 0;
  }

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const c = this.seleccionado();
    if (!c) return [];
    const d = this.rendimientoComercial();
    const rendimiento: SeccionFicha[] = d
      ? [{
          titulo: 'Rendimiento',
          icono: 'trending_up',
          datos: [
            { etiqueta: 'Conversión de prospectos', valor: `${this.pct(d.prospectosConvertidos, d.prospectosConvertidos + d.prospectosActivos)} % · ${d.prospectosConvertidos} pasaron a broker`, destacado: true },
            { etiqueta: 'Cotización → radicación', valor: `${this.pct(d.radicaciones, d.cotizaciones)} % · ${d.cotizaciones} cotizaciones, ${d.radicaciones} radicadas` },
            { etiqueta: 'Radicación → póliza', valor: `${this.pct(d.expedidas, d.radicaciones)} % · ${d.expedidas} pólizas` },
            { etiqueta: 'Renovación efectiva', valor: `${this.pct(d.renovadas, d.renovacionesCerradas)} % · ${d.renovadas} de ${d.renovacionesCerradas} con decisión` },
            { etiqueta: 'Primas del mes', valor: `${copCompacto(d.primasMes)} · ${d.polizasMes} pólizas` },
            { etiqueta: 'Prima promedio por póliza', valor: copCompacto(d.polizasTotal ? d.primasTotal / d.polizasTotal : 0) },
            { etiqueta: `Comisión del comercial (${c.porcentajeComision ?? 0} %)`, valor: cop(d.comisionComercial), destacado: true },
          ],
        }]
      : [];
    return [
      ...rendimiento,
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
          { etiqueta: 'Comisión en cuentas de cobro generadas (documento, no pago)', valor: cop(c.comision), destacado: true },
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
      /^\d{7,10}$/.test(this.telefono().trim()) &&
      porcentajeValido(this.porcentaje()),
  );

  constructor() {
    this.consola.rendimiento().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => this.rendimientoEquipo.set(d),
      error: () => this.rendimientoEquipo.set(null),
    });
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
  }

  protected crear(datos: PersonaRequest): void {
    this.enviandoAlta.set(true);
    this.consola
      .crearComercial(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alta) => {
          this.enviandoAlta.set(false);
          this.credencial.set(alta.credencial);
          this.feedback.toast({ variante: 'exito', mensaje: `Comercial ${datos.nombre} creado (${alta.codigo}); entra a la rotación de prospectos.` });
          this.cargar();
        },
        error: (err: unknown) => {
          this.enviandoAlta.set(false);
          this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
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
    this.rendimientoComercial.set(null);
    this.consola.rendimientoComercial(c.codigo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => this.rendimientoComercial.set(d),
      error: () => this.rendimientoComercial.set(null),
    });
    this.nombre.set(c.nombre);
    this.correo.set(c.correo ?? '');
    this.telefono.set(c.telefono ?? '');
    this.porcentaje.set(String(c.porcentajeComision ?? 0));
    this.credencialNueva.set(null);
  }

  protected guardarDatos(): void {
    const c = this.seleccionado();
    if (!c || !this.datosValidos()) return;
    const porcentaje = Number(this.porcentaje().trim().replace(',', '.'));
    const datos = this.consola.actualizarComercial(c.codigo, {
      nombre: this.nombre().trim(),
      correo: this.correo().trim(),
      telefono: this.telefono().trim(),
    });
    this.ejecutar(
      porcentaje === (c.porcentajeComision ?? 0)
        ? datos
        : datos.pipe(switchMap(() => this.consola.comisionComercial(c.codigo, porcentaje))),
      `Datos de ${this.nombre().trim()} actualizados.`,
    );
  }

  protected cambiarActivo(): void {
    const c = this.seleccionado();
    if (!c) return;
    const cartera = c.brokers + c.prospectos;
    if (c.activo && cartera > 0) {
      this.feedback.info({
        titulo: 'Desactivar comercial con cartera',
        mensaje: `${c.nombre} tiene ${c.brokers} ${c.brokers === 1 ? 'broker' : 'brokers'}, ${c.prospectos} ${c.prospectos === 1 ? 'prospecto' : 'prospectos'} y ${c.negocios} ${c.negocios === 1 ? 'negocio' : 'negocios'}. Al desactivarlo pasan a los demás comerciales activos, por turnos: ningún broker queda sin comercial. ¿Lo desactivamos?`,
        acciones: { confirmar: 'Desactivar', cancelar: 'Cancelar' },
        alResolver: (r) => {
          if (r === 'confirmar') this.ejecutarCambioActivo(c);
        },
      });
      return;
    }
    this.ejecutarCambioActivo(c);
  }

  /** Vacaciones: su cartera se presta por turnos a los demás comerciales y vuelve a él al regresar. */
  protected cambiarVacaciones(): void {
    const c = this.seleccionado();
    if (!c) return;
    const sale = !c.enVacaciones;
    const cuantos = sale ? c.brokers + c.prospectos : (c.prestados ?? 0);
    this.feedback.info({
      titulo: sale ? 'Marcar vacaciones' : 'Terminar vacaciones',
      mensaje: sale
        ? `Los ${cuantos} brokers y prospectos de ${c.nombre}, con sus negocios, pasan por turnos a los demás comerciales activos. Mientras tanto no recibe asignaciones nuevas. Al regresar, todo vuelve a él.`
        : `${c.nombre} regresa: sus ${cuantos} brokers y prospectos, con sus negocios, vuelven a él.`,
      acciones: { confirmar: sale ? 'Marcar vacaciones' : 'Terminar vacaciones', cancelar: 'Cancelar' },
      alResolver: (r) => {
        if (r !== 'confirmar') return;
        this.ejecutar(this.consola.vacacionesComercial(c.codigo, sale),
          sale ? `${c.nombre} está de vacaciones: su cartera quedó repartida.` : `${c.nombre} regresó: su cartera volvió a él.`);
      },
    });
  }

  private ejecutarCambioActivo(c: ComercialConsola): void {
    this.ejecutar(this.consola.activarComercial(c.codigo, !c.activo),
      c.activo ? `${c.nombre} quedó inactivo: su cartera pasó a los demás comerciales y él perdió el acceso.` : `${c.nombre} quedó activo.`);
  }

  protected restablecerAcceso(): void {
    const c = this.seleccionado();
    if (!c) return;
    this.guardando.set(true);
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
          this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
        },
      });
  }

  private ejecutar(accion: Observable<unknown>, exito: string): void {
    this.guardando.set(true);
    accion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.seleccionado.set(null);
        this.feedback.toast({ variante: 'exito', mensaje: exito });
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
      },
    });
  }
}
