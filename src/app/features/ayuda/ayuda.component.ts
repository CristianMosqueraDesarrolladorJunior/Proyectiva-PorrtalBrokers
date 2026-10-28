import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CatalogoService } from '../../core/services/catalogo.service';
import { AREAS_SOPORTE, SoporteService, areasTexto } from '../../core/services/soporte.service';
import type { AreaSoporte, SolicitudSoporte, TipoSoporte } from '../../core/services/soporte.service';
import { fechaHora } from '../../core/services/admin.helpers';
import {
  BotonComponent,
  DataTableComponent,
  FormFieldComponent,
  ModalDialogComponent,
  OpcionesCheckComponent,
} from '../../shared/components';
import type { ColumnaTabla, FilaTabla } from '../../shared/components';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FeedbackService } from '../../shared/services/feedback/feedback.service';
import { validarSoporte } from './soporte-validacion';

/**
 * Centro de ayuda (Req 33.5, 33.6): contactos directos, canales oficiales y preguntas frecuentes, todo desde los
 * catálogos de BD (`cat_contacto_ayuda`, `cat_faq_ayuda`). Arriba, el CTA de soporte con el tracking del broker.
 */
@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [PageHeaderComponent, BotonComponent, DataTableComponent, FormFieldComponent, FormsModule, ModalDialogComponent, OpcionesCheckComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ayuda.component.html',
  styleUrl: './ayuda.component.scss',
})
export class AyudaComponent implements OnInit {
  private readonly catalogo = inject(CatalogoService);
  private readonly soporte = inject(SoporteService);
  private readonly feedback = inject(FeedbackService);

  private readonly canales = this.catalogo.opciones('contacto_ayuda');
  protected readonly contactos = this.canales.filter((c) => c['tipo'] === 'directo');
  protected readonly oficiales = this.canales.filter((c) => c['tipo'] === 'oficial');
  protected readonly faqs = this.catalogo.opciones('faq_ayuda');

  protected readonly abierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly intentoEnvio = signal(false);
  protected readonly tipo = signal<TipoSoporte>('CORRECTIVO');
  protected readonly areas = signal<readonly AreaSoporte[]>([]);
  protected readonly opcionesAreas = AREAS_SOPORTE;
  protected readonly asunto = signal('');
  protected readonly observacion = signal('');
  protected readonly errores = computed(() => validarSoporte(this.asunto(), this.observacion(), this.areas()));

  protected readonly solicitudes = signal<readonly SolicitudSoporte[]>([]);
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'ticket', header: 'Ticket', tipo: 'principal', nowrap: true },
    { key: 'asunto', header: 'Asunto', tipo: 'principal' },
    { key: 'areas', header: 'Sobre' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'estado', header: 'Estado', tipo: 'badge' },
    { key: 'creado', header: 'Radicada', alinear: 'derecha', nowrap: true },
    { key: 'cierre', header: 'Solventada', alinear: 'derecha', nowrap: true },
  ];
  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.solicitudes().map((s) => ({
      ticket: s.ticket,
      asunto: s.asunto,
      areas: areasTexto(s.areas),
      tipo: s.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo',
      estado: s.estado === 'PENDIENTE' ? 'En atención' : 'Solventado',
      estadoVariante: s.estado === 'PENDIENTE' ? 'warning' : 'success',
      creado: fechaHora(s.creadoEn),
      cierre: fechaHora(s.solventadoEn),
    })),
  );

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.soporte.mias().subscribe({ next: (r) => this.solicitudes.set(r.solicitudes), error: () => undefined });
  }

  protected abrir(): void {
    this.intentoEnvio.set(false);
    this.abierto.set(true);
  }

  protected enviar(): void {
    this.intentoEnvio.set(true);
    if (Object.keys(this.errores()).length > 0 || this.enviando()) return;
    this.enviando.set(true);
    this.soporte.crear({ tipo: this.tipo(), areas: this.areas(), asunto: this.asunto().trim(), observacion: this.observacion().trim() }).subscribe({
      next: (s) => {
        this.enviando.set(false);
        this.abierto.set(false);
        this.areas.set([]);
        this.asunto.set('');
        this.observacion.set('');
        this.feedback.exito({ titulo: '¡Ya te ayudamos!', mensaje: `Recibimos tu solicitud. Tu ticket es ${s.ticket}; puedes seguirla en esta vista.` });
        this.cargar();
      },
      error: () => {
        this.enviando.set(false);
        this.feedback.error({ titulo: 'No se pudo enviar', mensaje: 'Intenta de nuevo en un momento.' });
      },
    });
  }
}
