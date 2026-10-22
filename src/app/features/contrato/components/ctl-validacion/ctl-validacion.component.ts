import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { ValidacionCtl } from '../../../../core/models/contrato.model';
import { ContratoService } from '../../../../core/services/contrato.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
} from '../../../../shared/components';
import type { ArchivoSeleccionado, ReglaDocumentoUploader } from '../../../../shared/components';

/** Días de antigüedad máxima del CTL (el servidor es quien decide; solo se muestra). */
export const ANTIGUEDAD_MAXIMA_CTL_DIAS = 90;

/**
 * Carga y validación del Certificado de Tradición y Libertad (CTL): el servidor lee el PDF y responde si su
 * antigüedad supera los 90 días y si la dirección coincide con la del contrato. Se reutiliza en la radicación y en
 * el módulo de contrato. Cada estado se comunica con ícono y texto, no solo con color.
 */
@Component({
  selector: 'app-ctl-validacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, DocUploaderComponent, EscaleritaLoaderComponent],
  template: `
    <section class="ctl" aria-label="Certificado de Tradición y Libertad">
      <app-doc-uploader
        [reglas]="reglas"
        [cargados]="cargados()"
        [disabled]="validando()"
        (archivoSeleccionado)="validar($event)"
      ></app-doc-uploader>

      @if (validando()) {
        <app-escalerita-loader texto="Validando el certificado… puede tardar unos segundos"></app-escalerita-loader>
      }

      @if (errorMensaje(); as mensaje) {
        <app-alert-banner variante="error" titulo="Revisa el certificado" icono="error">
          {{ mensaje }}
        </app-alert-banner>
      }

      @if (sinLectura() && adjunto()) {
        <app-alert-banner variante="warning" titulo="Certificado adjunto sin validar" icono="schedule">
          No pudimos leer el certificado automáticamente en este momento. Ya quedó adjunto: lo revisaremos con la
          radicación, puedes continuar.
        </app-alert-banner>
      }

      @if (resultado(); as r) {
        @if (r.motivo === 'fecha_no_determinada') {
          <app-alert-banner variante="warning" titulo="No pudimos validar la antigüedad" icono="help">
            No encontramos la fecha de impresión del certificado. Lo revisaremos con la radicación.
          </app-alert-banner>
        } @else if (!r.vigente) {
          <app-alert-banner variante="error" titulo="Certificado vencido" icono="event_busy">
            El certificado tiene {{ r.antiguedadDias }} días y supera los {{ maximaDias }} permitidos. Descarga uno
            nuevo.
          </app-alert-banner>
        } @else {
          <app-alert-banner variante="success" titulo="Certificado vigente" icono="event_available">
            Tiene {{ r.antiguedadDias }} días de antigüedad (máximo {{ maximaDias }}).
          </app-alert-banner>
        }

        @if (r.direccionCoincide === false) {
          <app-alert-banner variante="warning" titulo="La dirección no coincide con el contrato" icono="location_off">
            El certificado indica «{{ r.direccion }}», distinta de la dirección del contrato. Revísalas antes de
            continuar.
          </app-alert-banner>
        }

        @if (r.departamentoBloqueado) {
          <app-alert-banner variante="error" titulo="Departamento no habilitado" icono="block">
            El inmueble está en Antioquia, departamento no habilitado para radicación.
          </app-alert-banner>
        }
      }
    </section>
  `,
  styles: [
    `
      .ctl {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
    `,
  ],
})
export class CtlValidacionComponent {
  private readonly contratos = inject(ContratoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Dirección del contrato con la que se compara la del certificado (vacía = sin comparar). */
  readonly direccionContrato = input('');
  /** El contenedor confirma que el archivo quedó cargado (Radicación lo descarta si está repetido). */
  readonly adjunto = input(true);

  /** Resultado del servidor, para que el anfitrión conserve el estado y decida el flujo. */
  readonly validado = output<ValidacionCtl>();

  /** CTL elegido (para que el anfitrión lo adjunte a la radicación). */
  readonly archivo = output<File>();

  protected readonly maximaDias = ANTIGUEDAD_MAXIMA_CTL_DIAS;
  protected readonly validando = signal(false);
  protected readonly resultado = signal<ValidacionCtl | null>(null);
  protected readonly errorMensaje = signal('');
  /** El servicio de lectura no respondió: el archivo queda adjunto y la revisión es manual (no bloquea). */
  protected readonly sinLectura = signal(false);
  private readonly nombreArchivo = signal('');
  protected readonly cargados = computed<Readonly<Record<string, string>>>(() => {
    const nombre = this.nombreArchivo();
    const vacio: Record<string, string> = {};
    return nombre ? { certificadoTradicion: nombre } : vacio;
  });

  protected readonly reglas: readonly ReglaDocumentoUploader[] = [
    {
      id: 'certificadoTradicion',
      etiqueta: 'Certificado de Tradición y Libertad (CTL)',
      descripcion: 'PDF · máximo 10 MB · expedido hace 90 días o menos',
      icono: 'description',
    },
  ];

  protected validar(evento: ArchivoSeleccionado): void {
    const archivo = evento.archivo;
    const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
    if (!esPdf || archivo.size === 0 || archivo.size > 10 * 1024 * 1024) {
      this.resultado.set(null);
      this.errorMensaje.set('El certificado debe ser un PDF de máximo 10 MB.');
      return;
    }
    this.errorMensaje.set('');
    this.sinLectura.set(false);
    this.resultado.set(null);
    this.validando.set(true);
    this.contratos
      .validarCtl(archivo, this.direccionContrato())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.validando.set(false);
          this.nombreArchivo.set(archivo.name);
          this.resultado.set(r);
          this.archivo.emit(archivo);
          this.validado.emit(r);
        },
        error: (err: unknown) => {
          this.validando.set(false);
          const status = (err as { status?: number })?.status ?? 0;
          if (status === 400 || status === 422 || status === 413) {
            // El archivo no sirve (no es PDF, está vacío o ilegible): no se adjunta.
            this.errorMensaje.set(
              status === 422
                ? 'No pudimos leer este archivo como certificado. Verifica que sea el CTL completo, legible y sin contraseña.'
                : mensajeErrorIntegracion(err),
            );
            return;
          }
          // El servicio de lectura está caído o tardó demasiado: el certificado se adjunta igual (auditoría RD6).
          this.nombreArchivo.set(archivo.name);
          this.sinLectura.set(true);
          this.archivo.emit(archivo);
        },
      });
  }
}
