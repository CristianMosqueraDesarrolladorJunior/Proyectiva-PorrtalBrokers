import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  documentosRequeridosRadicacion,
  type ResultadoEstudioArrendamiento,
  type ResultadoSarlaftRadicacion,
  type TipoDocumentoIdentidad,
  type TipoDocumentoRadicacion,
  type TipoPersona,
} from '../../core/models/radicacion.model';
import { LayoutService } from '../../core/services/layout.service';
import { RadicacionService } from '../../core/services/radicacion.service';
import { SessionService } from '../../core/services/session.service';
import {
  DocUploaderComponent,
  FormFieldComponent,
  IconComponent,
  InfoBoxComponent,
  RadioGroupComponent,
  TabsComponent,
} from '../../shared/components';
import type { OpcionRadio } from '../../shared/components/radio-group/radio-group.component';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../shared/components/doc-uploader/doc-uploader.component';
import type { Tab } from '../../shared/components/tabs/tabs.component';
import { formatearCop } from '../../shared/util/moneda';
import {
  REGLAS_DOCUMENTO_RADICACION,
  validarDocumento,
} from '../../shared/validation/documento-validacion';
import {
  DESCRIPCION_DOCUMENTO_RADICACION,
  ETIQUETA_DOCUMENTO_RADICACION,
  ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD,
  TIPOS_DOCUMENTO_APODERADO,
  TIPOS_DOCUMENTO_IDENTIDAD,
  esNumeroDocumentoPropietarioValido,
  sujetoSarlaft,
} from '../radicacion/pages/radicacion/radicacion-presentacion';

/** Pantalla del escenario (una por paso o salida del flujo 02). */
type Escena =
  | 'bienvenida'
  | 'datos'
  | 'estudio'
  | 'firma'
  | 'sarlaft-pendiente'
  | 'sarlaft-fin'
  | 'todo-ok'
  | 'documentos'
  | 'radicar'
  | 'exito';

/** Palabra de un mensaje de Brok; `negrita` sale de los tramos `**…**`. */
interface Palabra {
  readonly texto: string;
  readonly negrita: boolean;
}

interface FilaChecklist {
  readonly texto: string;
  readonly estado: 'cargando' | 'ok' | 'alerta';
}

/** Elemento del chat. Todo se pinta con interpolación: nunca `[innerHTML]`. */
type ItemChat =
  | { readonly id: number; readonly tipo: 'brok'; readonly palabras: readonly Palabra[]; readonly hora: string; readonly escribiendo: boolean }
  | { readonly id: number; readonly tipo: 'broker'; readonly texto: string; readonly hora: string }
  | { readonly id: number; readonly tipo: 'accion'; readonly texto: string; readonly estado: 'cargando' | 'ok' | 'error' }
  | { readonly id: number; readonly tipo: 'divisor'; readonly texto: string }
  | { readonly id: number; readonly tipo: 'checklist'; readonly titulo: string; readonly filas: readonly FilaChecklist[] };

interface Foco {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly etiqueta: string;
}

/** Estado del dock SARLAFT que corre "en segundo plano" sobre el escenario. */
interface DockSarlaft {
  readonly progreso: number;
  readonly filas: readonly FilaChecklist[];
  readonly resultado: 'ok' | 'alerta' | 'fin' | null;
}

const PASOS = ['Datos del negocio', 'Estudio', 'Firmante', 'SARLAFT y documentos', 'Radicación'] as const;

const RECORRIDO = [
  { icono: 'person', titulo: 'Datos del negocio', tiempo: '~20s' },
  { icono: 'task_alt', titulo: 'Estudio', tiempo: '~20s' },
  { icono: 'draw', titulo: 'Firmante', tiempo: '~15s' },
  { icono: 'verified_user', titulo: 'SARLAFT y documentos', tiempo: '~40s' },
  { icono: 'send', titulo: 'Radicación', tiempo: '~10s' },
] as const;

const LISTAS_SARLAFT = [
  'Listas restrictivas internacionales (OFAC / ONU)',
  'Listas vinculantes nacionales',
  'Persona Expuesta Políticamente (PEP)',
  'Antecedentes disciplinarios y fiscales',
  'Vigencia del formulario de conocimiento',
];

const PASOS_ENVIO = ['Empaquetando expediente…', 'Enviando a la aseguradora…', 'Generando número de radicado…'];

/** Documentos que van en la sección del apoderado. */
const TIPOS_APODERADO: readonly TipoDocumentoRadicacion[] = ['poderApoderado', 'cedulaApoderado'];

const DOCUMENTO_OPCIONAL: TipoDocumentoRadicacion = 'contratoArrendamientoFirmado';

const CIRCUNFERENCIA_ANILLO = 119.4;

/** Longitud máxima de un mensaje del broker. */
const MAX_MENSAJE = 500;

class Cancelado extends Error {}

/** Normaliza texto libre para interpretarlo (minúsculas y sin tildes). */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Agente IA del broker: **Brok**, experiencia guiada (réplica del prototipo
 * `PortalAutogestionBrokers/index.html` con la marca Proyectiva).
 *
 * Un solo componente a pantalla completa: chat de Brok (con caja de mensajes)
 * a la izquierda y escenario a la derecha que cambia según el paso del flujo
 * 02 de radicación. Cada paso reutiliza los inputs de la plataforma
 * (`app-form-field`, `app-radio-group`, `app-tabs`, `app-doc-uploader`) y los
 * servicios reales (`RadicacionService`); el backend decide estudio, SARLAFT y
 * radicado. Los mensajes del broker se interpretan localmente contra el paso
 * activo (no hay LLM en el front) y nada se envía sin su clic en "Radicar".
 */
@Component({
  selector: 'app-agente',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IconComponent,
    FormFieldComponent,
    RadioGroupComponent,
    TabsComponent,
    DocUploaderComponent,
    InfoBoxComponent,
  ],
  templateUrl: './agente.component.html',
  styleUrl: './agente.component.scss',
})
export class AgenteComponent {
  private readonly radicacion = inject(RadicacionService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly perfil = inject(SessionService).perfil;

  protected readonly pasos = PASOS;
  protected readonly recorrido = RECORRIDO;
  protected readonly circunferencia = CIRCUNFERENCIA_ANILLO;
  protected readonly maxMensaje = MAX_MENSAJE;
  protected readonly moneda = formatearCop;

  protected readonly nombreBroker = computed(() => (this.perfil()?.nombre ?? 'Broker').split(' ')[0]);

  // --- Escenario, stepper y chat ---
  protected readonly escena = signal<Escena>('bienvenida');
  protected readonly paso = signal(1);
  protected readonly chat = signal<readonly ItemChat[]>([]);
  protected readonly estadoBrok = signal('Te escucho en pantalla');
  protected readonly pensando = signal(false);
  protected readonly chatExpandido = signal(false);
  protected readonly vistaPrevia = signal('');
  protected readonly foco = signal<Foco | null>(null);
  protected readonly dock = signal<DockSarlaft | null>(null);
  protected readonly celebrar = signal(false);
  protected readonly mensaje = signal('');

  // --- Paso 1: datos del propietario ---
  protected readonly tiposDocumento = TIPOS_DOCUMENTO_IDENTIDAD;
  protected readonly tiposDocumentoApoderado = TIPOS_DOCUMENTO_APODERADO;
  protected readonly etiquetaTipoDocumento = ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD;
  protected readonly tipoDocumentoPropietario = signal<TipoDocumentoIdentidad>('CC');
  protected readonly numeroDocumentoPropietario = signal('');
  protected readonly errorDocumento = signal('');
  protected readonly autocompletando = signal(false);
  protected readonly documentoValido = computed(() =>
    esNumeroDocumentoPropietarioValido(this.numeroDocumentoPropietario()),
  );

  // --- Paso 2: estudio de arrendamiento (API-gate) ---
  protected readonly numeroEstudio = signal('');
  protected readonly consultandoEstudio = signal(false);
  protected readonly estudio = signal<ResultadoEstudioArrendamiento | null>(null);
  protected readonly errorEstudio = signal<string | null>(null);
  protected readonly selloDibujado = signal(false);
  protected readonly estudioAprobado = computed(() => this.estudio()?.estado === 'aprobado');
  protected readonly puedeConsultarEstudio = computed(
    () => this.numeroEstudio().trim().length > 0 && !this.consultandoEstudio(),
  );
  /** Canon + administración: base mensual del valor asegurado. */
  protected readonly mensualidad = computed(() => {
    const i = this.estudio()?.inmueble;
    return i ? i.canon + i.administracion : 0;
  });

  // --- Paso 3: firmante y tipo de persona ---
  protected readonly opcionesFirmante: readonly OpcionRadio[] = [
    { valor: 'propietario', etiqueta: 'Propietario' },
    { valor: 'apoderado', etiqueta: 'Apoderado' },
  ];
  protected readonly tabsPersona: readonly Tab[] = [
    { id: 'natural', etiqueta: 'Persona Natural' },
    { id: 'juridica', etiqueta: 'Persona Jurídica' },
  ];
  protected readonly firmaApoderado = signal(false);
  protected readonly firmante = computed(() => (this.firmaApoderado() ? 'apoderado' : 'propietario'));
  protected readonly tipoPersona = signal<TipoPersona>('natural');
  protected readonly tipoDocumentoApoderado = signal<TipoDocumentoIdentidad>('CC');
  protected readonly numeroDocumentoApoderado = signal('');
  protected readonly firmaCompleta = computed(
    () => !this.firmaApoderado() || esNumeroDocumentoPropietarioValido(this.numeroDocumentoApoderado()),
  );
  protected readonly etiquetaSujeto = computed(() => {
    if (sujetoSarlaft(this.firmaApoderado()) === 'apoderado') {
      return 'apoderado';
    }
    return this.tipoPersona() === 'natural' ? 'propietario' : 'representante de la empresa';
  });

  // --- Paso 4: SARLAFT y documentos ---
  protected readonly sarlaft = signal<ResultadoSarlaftRadicacion | null>(null);
  protected readonly consultandoSarlaft = signal(false);
  protected readonly enlaceCopiado = signal(false);
  protected readonly archivosCargados = signal<Readonly<Record<string, string>>>({});
  private readonly tiposValidos = signal<ReadonlySet<TipoDocumentoRadicacion>>(new Set());
  protected readonly errorArchivo = signal<string | null>(null);
  protected readonly cargandoDemo = signal(false);

  private readonly obligatorios = computed(() =>
    documentosRequeridosRadicacion({
      tipoPersona: this.tipoPersona(),
      firmaApoderado: this.firmaApoderado(),
      sarlaftRequiereFormulario: false,
    }),
  );
  protected readonly reglasObligatorias = computed(() =>
    this.obligatorios()
      .filter((t) => !TIPOS_APODERADO.includes(t))
      .map((t) => this.regla(t, true)),
  );
  protected readonly reglasApoderado = computed(() =>
    this.firmaApoderado() ? TIPOS_APODERADO.map((t) => this.regla(t, true)) : [],
  );
  protected readonly reglaOpcional = [this.regla(DOCUMENTO_OPCIONAL, false)];
  protected readonly totalDocumentos = computed(() => this.obligatorios().length);
  protected readonly documentosValidados = computed(
    () => this.obligatorios().filter((t) => this.tiposValidos().has(t)).length,
  );
  protected readonly documentosCompletos = computed(
    () => this.totalDocumentos() > 0 && this.documentosValidados() === this.totalDocumentos(),
  );
  protected readonly desfaseAnillo = computed(
    () => CIRCUNFERENCIA_ANILLO - (CIRCUNFERENCIA_ANILLO * this.documentosValidados()) / Math.max(1, this.totalDocumentos()),
  );

  // --- Paso 5: radicación ---
  protected readonly declarado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly pasoEnvio = signal('');
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly radicado = signal('');
  protected readonly radicadoVisible = signal('');
  protected readonly fechaRadicado = signal('');

  protected readonly resumen = computed(() => {
    const e = this.estudio();
    return [
      { etiqueta: 'Propietario', valor: `${this.tipoDocumentoPropietario()} ${this.numeroDocumentoPropietario()}` },
      { etiqueta: 'Inquilino', valor: e?.inquilino?.nombre ?? '—' },
      { etiqueta: 'Inmueble', valor: e?.inmueble ? `${e.inmueble.direccion} · ${e.inmueble.ciudad}` : '—' },
      { etiqueta: 'Canon + administración', valor: formatearCop(this.mensualidad()) },
      { etiqueta: 'Estudio', valor: this.numeroEstudio() },
      {
        etiqueta: 'Firma',
        valor: this.firmaApoderado()
          ? `Apoderado · ${this.tipoDocumentoApoderado()} ${this.numeroDocumentoApoderado()}`
          : 'Propietario',
      },
      { etiqueta: 'Documentos', valor: `${this.documentosValidados()} de ${this.totalDocumentos()} validados` },
    ];
  });
  protected readonly checklistFinal = computed(() => [
    'Datos del propietario completos',
    'Estudio de arrendamiento aprobado',
    `SARLAFT del ${this.etiquetaSujeto()} actualizado`,
    ...this.obligatorios().map((t) => ETIQUETA_DOCUMENTO_RADICACION[t]),
  ]);

  /** Sugerencias rápidas para la caja de mensajes según el paso. */
  protected readonly sugerencias = computed<readonly string[]>(() => {
    switch (this.escena()) {
      case 'datos':
        return this.documentoValido() ? ['Continuar'] : ['¿Qué necesito?'];
      case 'estudio':
        return this.estudioAprobado() ? ['Continuar'] : ['Consultar estudio'];
      case 'firma':
        return ['Firma el propietario', 'Firma un apoderado', 'Continuar'];
      case 'sarlaft-pendiente':
        return ['Volver a consultar'];
      case 'documentos':
        return this.documentosCompletos() ? ['Continuar'] : ['Usar documentos de demo'];
      case 'radicar':
        return this.declarado() ? ['Radicar negocio'] : ['Acepto la declaración'];
      case 'exito':
        return ['Radicar otro negocio', 'Ir a Seguimiento'];
      default:
        return [];
    }
  });

  // --- Control de la guía (cola serial de acciones de Brok) ---
  private corrida = 0;
  private secuencia = 0;
  private cola: Promise<void> = Promise.resolve();
  private objetivoFoco: HTMLElement | null = null;
  private etiquetaFoco = '';
  private posCursor: { x: number; y: number } | null = null;
  private guiaContinuarDatos = false;

  constructor() {
    // Brok ocupa toda la pantalla: sin paddings y con el sidebar en riel.
    this.layout.fijarPantallaCompleta(true);
    this.layout.fijarSidebarTemporal(true);
    const alScroll = (): void => this.reposicionarFoco();
    document.addEventListener('scroll', alScroll, true);
    inject(DestroyRef).onDestroy(() => {
      this.corrida++;
      document.removeEventListener('scroll', alScroll, true);
      this.limpiarEfectos();
      this.layout.fijarPantallaCompleta(false);
      this.layout.restaurarSidebar();
    });
    this.reiniciar();
  }

  @HostListener('window:resize')
  protected reposicionarFoco(): void {
    if (!this.objetivoFoco) {
      return;
    }
    const r = this.objetivoFoco.getBoundingClientRect();
    this.foco.set({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12, etiqueta: this.etiquetaFoco });
  }

  // ===========================================================================
  // Recorrido
  // ===========================================================================

  /** Reinicia la demo desde la bienvenida. */
  protected reiniciar(): void {
    this.corrida++;
    this.cola = Promise.resolve();
    this.limpiarEfectos();
    this.chat.set([]);
    this.vistaPrevia.set('');
    this.mensaje.set('');
    this.dock.set(null);
    this.paso.set(1);
    this.celebrar.set(false);
    this.tipoDocumentoPropietario.set('CC');
    this.numeroDocumentoPropietario.set('');
    this.errorDocumento.set('');
    this.numeroEstudio.set('');
    this.consultandoEstudio.set(false);
    this.estudio.set(null);
    this.errorEstudio.set(null);
    this.selloDibujado.set(false);
    this.firmaApoderado.set(false);
    this.tipoPersona.set('natural');
    this.tipoDocumentoApoderado.set('CC');
    this.numeroDocumentoApoderado.set('');
    this.sarlaft.set(null);
    this.consultandoSarlaft.set(false);
    this.archivosCargados.set({});
    this.tiposValidos.set(new Set());
    this.errorArchivo.set(null);
    this.declarado.set(false);
    this.enviando.set(false);
    this.errorEnvio.set(null);
    this.radicado.set('');
    this.radicadoVisible.set('');
    this.guiaContinuarDatos = false;
    this.escena.set('bienvenida');
    this.encolar(async () => {
      await this.decir(`¡Hola, **${this.nombreBroker()}**! 👋 Soy **Brok**, tu asistente de Proyectiva.`);
      await this.decir('Vamos a radicar la póliza de arrendamiento de tu cliente. Yo consulto el estudio, el SARLAFT y valido los documentos; tú me das los datos del negocio.');
      await this.decir('Puedes usar la pantalla o escribirme abajo. Empecemos por el propietario.');
      await this.esperar(1000);
      await this.entrarDatos();
    });
  }

  private async entrarDatos(): Promise<void> {
    this.paso.set(1);
    const accion = this.accion('Abriendo datos del propietario');
    this.escena.set('datos');
    await this.esperar(450);
    this.accionLista(accion);
    await this.guiarA(this.elemento('brok-num-doc'), 'Brok te indica aquí');
    await this.decir('Escribe el **número de documento del propietario** del inmueble.');
    if (this.documentoValido()) {
      await this.guiarContinuar();
    }
  }

  private async guiarContinuar(): Promise<void> {
    if (this.guiaContinuarDatos) {
      return;
    }
    this.guiaContinuarDatos = true;
    await this.guiarA(this.elemento('brok-continuar-datos'), 'Continúa cuando quieras');
    await this.decir('Perfecto. Dale a **Continuar** para consultar el estudio.');
  }

  protected onNumeroDocumento(valor: string): void {
    this.numeroDocumentoPropietario.set(valor.replace(/\D/g, '').slice(0, 15));
    this.errorDocumento.set('');
    if (this.documentoValido() && this.escena() === 'datos' && !this.autocompletando()) {
      this.encolar(() => this.guiarContinuar());
    }
  }

  protected validarDocumentoAlSalir(): void {
    if (this.numeroDocumentoPropietario() && !this.documentoValido()) {
      this.errorDocumento.set('El documento debe tener entre 5 y 15 dígitos.');
    }
  }

  /** Escribe el documento de demostración carácter a carácter. */
  protected async autocompletarDocumento(): Promise<void> {
    if (this.autocompletando()) {
      return;
    }
    this.autocompletando.set(true);
    try {
      await this.escribir('1095836251', (v) => this.numeroDocumentoPropietario.set(v));
    } catch {
      // Cancelado por reinicio.
    } finally {
      this.autocompletando.set(false);
    }
    this.encolar(() => this.guiarContinuar());
  }

  protected continuarDatos(): void {
    if (!this.documentoValido()) {
      return;
    }
    this.encolar(async () => {
      this.quitarFoco();
      this.paso.set(2);
      this.divisor('Etapa 2 · Estudio de arrendamiento');
      this.escena.set('estudio');
      await this.guiarA(this.elemento('brok-num-estudio'), 'Número de estudio');
      await this.decir('Escribe el **número de estudio de arrendamiento** del inquilino y presiona **Consultar estudio**.');
    });
  }

  protected onNumeroEstudio(valor: string): void {
    this.numeroEstudio.set(valor.toUpperCase().slice(0, 30));
    // Un número nuevo invalida la consulta anterior.
    if (this.estudio()) {
      this.estudio.set(null);
      this.selloDibujado.set(false);
    }
    this.errorEstudio.set(null);
  }

  protected async autocompletarEstudio(): Promise<void> {
    if (this.autocompletando()) {
      return;
    }
    this.autocompletando.set(true);
    try {
      await this.escribir('EST-2026-001234', (v) => this.onNumeroEstudio(v));
    } catch {
      // Cancelado por reinicio.
    } finally {
      this.autocompletando.set(false);
    }
    this.encolar(() => this.guiarA(this.elemento('brok-consultar-estudio'), 'Consulta el estudio'));
  }

  /** Paso 2: consulta la API de estudio. El backend decide la salida. */
  protected consultarEstudio(): void {
    if (!this.puedeConsultarEstudio()) {
      return;
    }
    this.encolar(async () => {
      this.quitarFoco();
      this.consultandoEstudio.set(true);
      this.estudio.set(null);
      this.errorEstudio.set(null);
      this.selloDibujado.set(false);
      const accion = this.accion(`Consultando estudio ${this.numeroEstudio()}`);
      this.estadoBrok.set('Consultando estudio…');
      this.pensando.set(true);
      let resultado: ResultadoEstudioArrendamiento;
      try {
        const [r] = await Promise.all([
          this.llamar(firstValueFrom(this.radicacion.consultarEstudio(this.numeroEstudio().trim()))),
          this.esperar(900),
        ]);
        resultado = r;
      } catch (e) {
        if (e instanceof Cancelado) {
          throw e;
        }
        this.accionFallida(accion);
        this.consultandoEstudio.set(false);
        this.pensando.set(false);
        this.estadoBrok.set('Te escucho en pantalla');
        this.errorEstudio.set('No fue posible consultar el estudio en este momento. Intenta nuevamente.');
        await this.decir('No pude consultar el estudio. Revisa el número e inténtalo de nuevo.');
        return;
      }
      this.accionLista(accion);
      this.consultandoEstudio.set(false);
      this.pensando.set(false);
      this.estadoBrok.set('Te escucho en pantalla');
      this.estudio.set(resultado);

      if (resultado.estado === 'no_aprobado') {
        await this.decir('El estudio **no está aprobado**. El inquilino debe realizar el **Estudio Digital**; te dejo el enlace para compartírselo.');
        return;
      }
      if (resultado.estado === 'pendiente') {
        await this.decir('El estudio aún está **en proceso**. Cuando la aseguradora lo resuelva, vuelve a consultarlo.');
        return;
      }
      await this.esperar(150);
      this.selloDibujado.set(true);
      const inq = resultado.inquilino;
      const inm = resultado.inmueble;
      await this.decir(`¡Estudio **aprobado** ✅! El inquilino es **${inq?.nombre ?? 'el titular del estudio'}**.`);
      if (inm) {
        await this.decir(
          `El inmueble es ${inm.destino.toLowerCase()} en **${inm.direccion}, ${inm.ciudad}**, con canon de **${formatearCop(inm.canon)}** y administración de ${formatearCop(inm.administracion)}.`,
        );
      }
      await this.guiarA(this.elemento('brok-continuar-estudio'), 'Continúa al firmante');
      await this.decir('Si todo coincide, dale a **Continuar**.');
    });
  }

  protected continuarEstudio(): void {
    if (!this.estudioAprobado()) {
      return;
    }
    this.encolar(async () => {
      this.quitarFoco();
      this.paso.set(3);
      this.divisor('Etapa 3 · Firmante');
      this.escena.set('firma');
      await this.guiarA(this.elemento('brok-firmante'), 'Elige quién firma');
      await this.decir('Ahora dime **quién firma el contrato** y el tipo de persona del propietario.');
    });
  }

  protected onCambioFirmante(valor: string): void {
    this.firmaApoderado.set(valor === 'apoderado');
    if (valor === 'apoderado') {
      this.encolar(async () => {
        await this.guiarA(this.elemento('brok-num-doc-apo'), 'Documento del apoderado');
        await this.decir('Como firma un **apoderado**, el SARLAFT se le consulta a él. Escribe su documento.');
      });
    }
  }

  protected onNumeroApoderado(valor: string): void {
    this.numeroDocumentoApoderado.set(valor.replace(/\D/g, '').slice(0, 15));
  }

  protected onCambioTipoPersona(id: string): void {
    this.tipoPersona.set(id === 'juridica' ? 'juridica' : 'natural');
  }

  protected continuarFirma(): void {
    if (!this.firmaCompleta()) {
      return;
    }
    this.encolar(async () => {
      this.quitarFoco();
      this.paso.set(4);
      this.divisor('Etapa 4 · SARLAFT y documentos');
      await this.correrSarlaft();
    });
  }

  /** Consulta SARLAFT con el dock y el checklist en vivo; el backend decide la salida. */
  private async correrSarlaft(): Promise<void> {
    this.sarlaft.set(null);
    this.enlaceCopiado.set(false);
    this.consultandoSarlaft.set(true);
    const filas = LISTAS_SARLAFT.map((texto): FilaChecklist => ({ texto, estado: 'cargando' }));
    this.dock.set({ progreso: 0, filas, resultado: null });
    const checklist = this.checklist(`Validación SARLAFT del ${this.etiquetaSujeto()}`, LISTAS_SARLAFT);
    this.estadoBrok.set('Validando SARLAFT…');
    this.pensando.set(true);

    const documento = this.firmaApoderado()
      ? { tipo: this.tipoDocumentoApoderado(), numero: this.numeroDocumentoApoderado() }
      : { tipo: this.tipoDocumentoPropietario(), numero: this.numeroDocumentoPropietario() };
    const consulta = firstValueFrom(
      this.radicacion.consultarSarlaft({
        sujeto: sujetoSarlaft(this.firmaApoderado()),
        tipoDocumento: documento.tipo,
        numeroDocumento: documento.numero.trim(),
        tipoPersona: this.tipoPersona(),
        numeroEstudioArrendamiento: this.numeroEstudio().trim(),
      }),
    );

    let resultado: ResultadoSarlaftRadicacion;
    try {
      for (let i = 0; i < LISTAS_SARLAFT.length - 1; i++) {
        await this.esperar(700 + Math.random() * 400);
        this.marcarSarlaft(checklist, i, 'ok');
      }
      resultado = await this.llamar(consulta);
    } catch (e) {
      if (e instanceof Cancelado) {
        throw e;
      }
      this.consultandoSarlaft.set(false);
      this.pensando.set(false);
      this.estadoBrok.set('Te escucho en pantalla');
      this.dock.set(null);
      this.escena.set('firma');
      this.paso.set(3);
      await this.decir('No fue posible consultar SARLAFT en este momento. Inténtalo de nuevo.');
      return;
    }
    const ultima = LISTAS_SARLAFT.length - 1;
    this.marcarSarlaft(checklist, ultima, resultado.estado === 'actualizado' ? 'ok' : 'alerta');
    await this.esperar(400);
    this.consultandoSarlaft.set(false);
    this.pensando.set(false);
    this.estadoBrok.set('Te escucho en pantalla');
    this.sarlaft.set(resultado);

    if (resultado.estado === 'actualizado') {
      this.dock.update((d) => (d ? { ...d, resultado: 'ok' } : d));
      await this.decir(`Listo: el **SARLAFT** del ${this.etiquetaSujeto()} está **actualizado**. Sin coincidencias en listas restrictivas ni PEP.`);
      await this.decir('Todo está en orden ✅ Estudio aprobado y SARLAFT actualizado.');
      this.escena.set('todo-ok');
      await this.esperar(2300);
      await this.entrarDocumentos();
    } else if (resultado.estado === 'desactualizado') {
      this.dock.update((d) => (d ? { ...d, resultado: 'alerta' } : d));
      this.escena.set('sarlaft-pendiente');
      await this.decir(`El SARLAFT del ${this.etiquetaSujeto()} está **desactualizado**. Le enviamos la URL de actualización; cuando la diligencie, vuelve a consultar.`);
      await this.guiarA(this.elemento('brok-reconsultar'), 'Vuelve a consultar aquí');
    } else {
      this.dock.update((d) => (d ? { ...d, resultado: 'fin' } : d));
      this.escena.set('sarlaft-fin');
      await this.decir(`El ${this.etiquetaSujeto()} aparece como **consultable**. El caso pasa a revisión de Cumplimiento y el trámite termina aquí en el portal.`);
    }
  }

  protected reconsultarSarlaft(): void {
    if (this.consultandoSarlaft()) {
      return;
    }
    this.encolar(async () => {
      this.quitarFoco();
      await this.correrSarlaft();
    });
  }

  protected copiarEnlace(texto: string | undefined): void {
    if (!texto) {
      return;
    }
    void navigator.clipboard
      ?.writeText(texto)
      .then(() => this.enlaceCopiado.set(true))
      .catch(() => this.enlaceCopiado.set(false));
  }

  /** Salida "consultable": corregir los datos de la persona consultada. */
  protected corregirSarlaft(): void {
    this.encolar(async () => {
      this.dock.set(null);
      this.sarlaft.set(null);
      if (this.firmaApoderado()) {
        this.paso.set(3);
        this.escena.set('firma');
        await this.decir('Corrige el documento del apoderado y vuelve a continuar.');
      } else {
        this.guiaContinuarDatos = false;
        await this.entrarDatos();
      }
    });
  }

  private async entrarDocumentos(): Promise<void> {
    const accion = this.accion('Preparando cargue de documentos');
    this.escena.set('documentos');
    await this.esperar(400);
    this.accionLista(accion);
    await this.guiarA(this.elemento('brok-docs'), 'Carga aquí cada documento');
    await this.decir(`Necesito **${this.totalDocumentos()} documentos** del negocio. Cárgalos uno a uno o usa los de demo.`);
    await this.esperar(500);
    this.quitarFoco();
  }

  /** Valida el archivo con la lógica compartida (MIME, extensión, tamaño). El backend revalida todo. */
  protected onArchivo(evento: ArchivoSeleccionado): void {
    this.procesarArchivo(evento.id as TipoDocumentoRadicacion, evento.archivo);
  }

  private procesarArchivo(tipo: TipoDocumentoRadicacion, archivo: File): void {
    const regla = { ...REGLAS_DOCUMENTO_RADICACION[tipo], vigenciaMaxDias: null };
    const resultado = validarDocumento(
      { nombre: archivo.name, tipoMime: archivo.type as never, tamanoBytes: archivo.size, fechaEmision: undefined },
      regla,
      new Date().toISOString(),
    );
    const etiqueta = ETIQUETA_DOCUMENTO_RADICACION[tipo];
    if (!resultado.valido) {
      this.errorArchivo.set(`«${archivo.name}» no cumple los requisitos de ${etiqueta}: usa PDF, JPG o PNG dentro del tamaño permitido.`);
      this.encolar(() => this.decir(`Ese archivo no lo pude procesar para **${etiqueta}**. Súbelo en PDF, JPG o PNG, por favor.`));
      return;
    }
    this.errorArchivo.set(null);
    this.archivosCargados.update((a) => ({ ...a, [tipo]: archivo.name }));
    this.tiposValidos.update((a) => new Set(a).add(tipo));
    const completos = this.documentosCompletos();
    this.encolar(async () => {
      await this.decir(`**${etiqueta}** validado ✅`);
      if (completos && this.escena() === 'documentos') {
        await this.decir('¡Todos los documentos están validados! Ya podemos **radicar**.');
        await this.guiarA(this.elemento('brok-continuar-docs'), 'Continuar');
      }
    });
  }

  /** Carga documentos PDF de demostración en cada casilla pendiente. */
  protected async usarDocumentosDemo(): Promise<void> {
    if (this.cargandoDemo()) {
      return;
    }
    this.cargandoDemo.set(true);
    const corrida = this.corrida;
    try {
      for (const tipo of [...this.obligatorios()]) {
        if (this.corrida !== corrida) {
          return;
        }
        if (this.tiposValidos().has(tipo)) {
          continue;
        }
        const contenido = new Blob([`%PDF-1.4 documento demo ${tipo} `.repeat(40)], { type: 'application/pdf' });
        this.procesarArchivo(tipo, new File([contenido], `${tipo}-demo.pdf`, { type: 'application/pdf' }));
        await this.esperar(650);
      }
    } catch {
      // Cancelado por reinicio.
    } finally {
      this.cargandoDemo.set(false);
    }
  }

  protected continuarDocumentos(): void {
    if (!this.documentosCompletos()) {
      return;
    }
    this.encolar(async () => {
      this.quitarFoco();
      this.paso.set(5);
      this.divisor('Etapa 5 · Radicación');
      this.escena.set('radicar');
      await this.decir('Revisa el resumen. Si todo está bien, acepta la declaración y presiona **Radicar negocio**.');
      await this.guiarA(this.elemento('brok-declaro'), 'Marca para continuar');
    });
  }

  protected alternarDeclaracion(): void {
    this.declarado.update((v) => !v);
    if (this.declarado()) {
      this.encolar(() => this.guiarA(this.elemento('brok-radicar'), 'Radicar negocio'));
    }
  }

  /** Único punto de escritura: la acción del broker en "Radicar negocio". */
  protected radicar(): void {
    if (!this.declarado() || this.enviando()) {
      return;
    }
    this.encolar(async () => {
      this.quitarFoco();
      this.enviando.set(true);
      this.errorEnvio.set(null);
      const inq = this.estudio()?.inquilino;
      const envio = firstValueFrom(
        this.radicacion.radicar({
          tipoDocumentoPropietario: this.tipoDocumentoPropietario(),
          numeroDocumentoPropietario: this.numeroDocumentoPropietario(),
          numeroEstudioArrendamiento: this.numeroEstudio().trim(),
          estadoEstudio: 'aprobado',
          ...(inq ? { inquilino: { nombre: inq.nombre } } : {}),
          tipoPersona: this.tipoPersona(),
          firmaApoderado: this.firmaApoderado(),
          ...(this.firmaApoderado()
            ? { tipoDocumentoApoderado: this.tipoDocumentoApoderado(), numeroDocumentoApoderado: this.numeroDocumentoApoderado().trim() }
            : {}),
          sarlaftRequiereFormulario: false,
          estadoSarlaft: 'actualizado',
          documentos: [],
        }),
      );
      let respuesta: { radicado: string };
      try {
        for (const texto of PASOS_ENVIO) {
          this.pasoEnvio.set(texto);
          const accion = this.accion(texto);
          await this.esperar(850);
          this.accionLista(accion);
        }
        respuesta = await this.llamar(envio);
      } catch (e) {
        if (e instanceof Cancelado) {
          throw e;
        }
        this.enviando.set(false);
        this.errorEnvio.set('No se pudo registrar la radicación. Intenta nuevamente en unos minutos.');
        await this.decir('No pude registrar la radicación. Inténtalo de nuevo en unos minutos.');
        return;
      }
      this.enviando.set(false);
      this.radicado.set(respuesta.radicado);
      this.fechaRadicado.set(new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }));
      this.paso.set(6);
      this.escena.set('exito');
      this.celebrar.set(true);
      this.lanzarConfeti();
      await this.animarRadicado(respuesta.radicado);
      this.estadoBrok.set('Proceso completado');
      await this.decir(`¡Listo, ${this.nombreBroker()}! 🎉 El negocio quedó radicado con el número **${respuesta.radicado}**.`);
      await this.decir('Lo verás en **Seguimiento** y te aviso cuando la aseguradora emita la póliza.');
    });
  }

  protected irASeguimiento(): void {
    void this.router.navigate(['/app/seguimiento']);
  }

  protected copiarRadicado(): void {
    void navigator.clipboard?.writeText(this.radicado()).catch(() => undefined);
  }

  protected alternarChat(): void {
    this.chatExpandido.update((v) => !v);
  }

  // ===========================================================================
  // Caja de mensajes: el broker también puede escribirle a Brok
  // ===========================================================================

  protected onMensaje(evento: Event): void {
    this.mensaje.set((evento.target as HTMLTextAreaElement).value.slice(0, MAX_MENSAJE));
  }

  protected onEnterMensaje(evento: Event): void {
    if ((evento as KeyboardEvent).shiftKey) {
      return;
    }
    evento.preventDefault();
    this.enviarMensaje(this.mensaje());
  }

  /** Publica el mensaje del broker y Brok actúa según el paso activo. */
  protected enviarMensaje(texto: string): void {
    const limpio = texto.trim().slice(0, MAX_MENSAJE);
    if (!limpio) {
      return;
    }
    this.mensaje.set('');
    this.chat.update((c) => [...c, { id: ++this.secuencia, tipo: 'broker', texto: limpio, hora: this.hora() }]);
    this.bajarChat();
    this.interpretar(limpio);
  }

  /**
   * Intérprete local de intenciones por paso. No hay LLM en el front: se
   * reconocen órdenes simples y datos (números de documento/estudio) y se
   * ejecutan las mismas acciones que los botones del escenario.
   */
  private interpretar(texto: string): void {
    const t = normalizar(texto);
    const digitos = texto.replace(/\D/g, '');
    const quiere = (patron: RegExp): boolean => patron.test(t);
    const continuar = /\b(continu|siguiente|listo|dale|seguir|avanza)/;

    if (quiere(/\b(reinici|empezar de nuevo|otro negocio|nuevo negocio)/)) {
      this.reiniciar();
      return;
    }
    if (quiere(/\bseguimiento\b/)) {
      this.irASeguimiento();
      return;
    }

    switch (this.escena()) {
      case 'datos': {
        const tipo = quiere(/\bnit\b/) ? 'NIT' : quiere(/\b(ce|extranjeria)\b/) ? 'CE' : quiere(/\bpasaporte\b/) ? 'PA' : null;
        if (tipo) {
          this.tipoDocumentoPropietario.set(tipo);
        }
        if (digitos.length >= 5) {
          this.onNumeroDocumento(digitos);
          if (this.documentoValido()) {
            this.encolar(() => this.decir(`Anoté el documento **${this.numeroDocumentoPropietario()}** del propietario.`));
            this.continuarDatos();
            return;
          }
        }
        if (quiere(continuar) && this.documentoValido()) {
          this.continuarDatos();
          return;
        }
        this.responder('Necesito el **número de documento del propietario** (entre 5 y 15 dígitos). Escríbelo aquí o en el formulario.');
        return;
      }
      case 'estudio': {
        if (this.estudioAprobado() && quiere(continuar)) {
          this.continuarEstudio();
          return;
        }
        const numero = texto.match(/[A-Za-z]{2,4}-?\d{4}-?\d{3,8}|\d{4,}/);
        if (numero) {
          this.onNumeroEstudio(numero[0]);
          this.consultarEstudio();
          return;
        }
        if (quiere(/\bconsult/) && this.puedeConsultarEstudio()) {
          this.consultarEstudio();
          return;
        }
        this.responder('Escríbeme el **número de estudio** (por ejemplo EST-2026-001234) y lo consulto.');
        return;
      }
      case 'firma': {
        if (quiere(/\bapoderad/)) {
          this.onCambioFirmante('apoderado');
        } else if (quiere(/\bpropietari/)) {
          this.onCambioFirmante('propietario');
        }
        if (quiere(/\bjuridic/)) {
          this.onCambioTipoPersona('juridica');
        } else if (quiere(/\bnatural/)) {
          this.onCambioTipoPersona('natural');
        }
        if (this.firmaApoderado() && digitos.length >= 5) {
          this.onNumeroApoderado(digitos);
        }
        if (quiere(continuar)) {
          if (this.firmaCompleta()) {
            this.continuarFirma();
          } else {
            this.responder('Antes de continuar necesito el **documento del apoderado**.');
          }
          return;
        }
        this.responder(`Anotado: firma el **${this.firmante()}**, persona ${this.tipoPersona() === 'natural' ? 'natural' : 'jurídica'}. Escribe **continuar** cuando estés listo.`);
        return;
      }
      case 'sarlaft-pendiente':
        if (quiere(/\b(consult|actualiz|ya)/)) {
          this.reconsultarSarlaft();
          return;
        }
        this.responder('Cuando el firmante actualice su SARLAFT, escribe **volver a consultar**.');
        return;
      case 'documentos':
        if (quiere(/\bdemo\b/)) {
          void this.usarDocumentosDemo();
          return;
        }
        if (quiere(continuar) && this.documentosCompletos()) {
          this.continuarDocumentos();
          return;
        }
        this.responder(`Llevas **${this.documentosValidados()} de ${this.totalDocumentos()}** documentos. Cárgalos en el panel o escribe **demo** para usar los de prueba.`);
        return;
      case 'radicar':
        if (quiere(/\b(acept|declar|autoriz)/) && !this.declarado()) {
          this.alternarDeclaracion();
          this.responder('Declaración aceptada. Escribe **radicar** o presiona el botón para enviar.');
          return;
        }
        if (quiere(/\b(radic|envi)/)) {
          if (this.declarado()) {
            this.radicar();
          } else {
            this.responder('Primero acepta la **declaración** (escribe **acepto**).');
          }
          return;
        }
        this.responder('Revisa el resumen. Escribe **acepto** y luego **radicar** cuando estés listo.');
        return;
      case 'exito':
        this.responder('Escribe **otro negocio** para radicar uno nuevo o **seguimiento** para ver tus negocios.');
        return;
      default:
        this.responder('Dame un momento, estoy preparando el recorrido.');
    }
  }

  private responder(texto: string): void {
    this.encolar(() => this.decir(texto));
  }

  // ===========================================================================
  // Chat de Brok
  // ===========================================================================

  /** Brok escribe: puntos de "escribiendo" y luego el texto palabra por palabra. */
  private async decir(texto: string): Promise<void> {
    const id = ++this.secuencia;
    const palabras = this.aPalabras(texto);
    this.chat.update((c) => [...c, { id, tipo: 'brok', palabras, hora: this.hora(), escribiendo: true }]);
    this.estadoBrok.set('Escribiendo…');
    this.pensando.set(true);
    this.bajarChat();
    await this.esperar(Math.min(1500, 300 + texto.length * 10));
    this.chat.update((c) => c.map((m) => (m.id === id && m.tipo === 'brok' ? { ...m, escribiendo: false } : m)));
    this.bajarChat();
    await this.esperar(palabras.length * 28 + 120);
    this.estadoBrok.set('Te escucho en pantalla');
    this.pensando.set(false);
    this.vistaPrevia.set(texto.replace(/\*\*/g, ''));
  }

  private aPalabras(texto: string): Palabra[] {
    const palabras: Palabra[] = [];
    texto.split(/(\*\*[^*]+\*\*)/).forEach((tramo) => {
      const negrita = tramo.startsWith('**') && tramo.endsWith('**');
      const limpio = negrita ? tramo.slice(2, -2) : tramo;
      limpio
        .split(' ')
        .filter((p) => p.length > 0)
        .forEach((p) => palabras.push({ texto: p, negrita }));
    });
    return palabras;
  }

  private accion(texto: string): number {
    const id = ++this.secuencia;
    this.chat.update((c) => [...c, { id, tipo: 'accion', texto, estado: 'cargando' }]);
    this.bajarChat();
    return id;
  }

  private accionLista(id: number): void {
    this.chat.update((c) => c.map((m) => (m.id === id && m.tipo === 'accion' ? { ...m, estado: 'ok' } : m)));
  }

  private accionFallida(id: number): void {
    this.chat.update((c) => c.map((m) => (m.id === id && m.tipo === 'accion' ? { ...m, estado: 'error' } : m)));
  }

  private divisor(texto: string): void {
    this.chat.update((c) => [...c, { id: ++this.secuencia, tipo: 'divisor', texto }]);
    this.bajarChat();
  }

  private checklist(titulo: string, filas: readonly string[]): number {
    const id = ++this.secuencia;
    this.chat.update((c) => [
      ...c,
      { id, tipo: 'checklist', titulo, filas: filas.map((texto): FilaChecklist => ({ texto, estado: 'cargando' })) },
    ]);
    this.bajarChat();
    return id;
  }

  private marcarSarlaft(idChecklist: number, indice: number, estado: FilaChecklist['estado']): void {
    const marcar = (filas: readonly FilaChecklist[]): FilaChecklist[] =>
      filas.map((f, i) => (i === indice ? { ...f, estado } : f));
    this.chat.update((c) =>
      c.map((m) => (m.id === idChecklist && m.tipo === 'checklist' ? { ...m, filas: marcar(m.filas) } : m)),
    );
    this.dock.update((d) =>
      d ? { ...d, filas: marcar(d.filas), progreso: ((indice + 1) / LISTAS_SARLAFT.length) * 100 } : d,
    );
  }

  private bajarChat(): void {
    setTimeout(() => {
      const lista = this.host.nativeElement.querySelector<HTMLElement>('.brok-chat__lista');
      lista?.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' });
    });
  }

  private hora(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ===========================================================================
  // Foco (spotlight) y cursor guía
  // ===========================================================================

  private elemento(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`#${id}`);
  }

  /** Mueve el cursor guía hasta el elemento y lo resalta con el anillo. */
  private async guiarA(el: HTMLElement | null, etiqueta: string): Promise<void> {
    await this.esperar(60);
    el = el?.isConnected ? el : null;
    if (!el) {
      return;
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    await this.moverCursor(el);
    this.objetivoFoco = el;
    this.etiquetaFoco = etiqueta;
    this.reposicionarFoco();
  }

  private quitarFoco(): void {
    this.objetivoFoco = null;
    this.foco.set(null);
  }

  private async moverCursor(el: HTMLElement): Promise<void> {
    const cursor = this.host.nativeElement.querySelector<HTMLElement>('.brok-cursor');
    const orbe = this.host.nativeElement.querySelector<HTMLElement>('.brok-chat__orbe');
    if (!cursor || !orbe) {
      return;
    }
    const centro = (e: HTMLElement): { x: number; y: number } => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const destino = centro(el);
    const origen = this.posCursor ?? centro(orbe);
    cursor.style.opacity = '1';
    if (!this.movimientoReducido()) {
      try {
        await cursor.animate(
          [
            { left: `${origen.x}px`, top: `${origen.y}px` },
            { left: `${destino.x}px`, top: `${destino.y}px` },
          ],
          { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' },
        ).finished;
      } catch {
        // Animación interrumpida: se fija la posición final abajo.
      }
    }
    cursor.style.left = `${destino.x}px`;
    cursor.style.top = `${destino.y}px`;
    this.posCursor = destino;
    await this.esperar(this.movimientoReducido() ? 60 : 380);
    cursor.style.opacity = '0';
  }

  // ===========================================================================
  // Éxito: radicado tipo "tragamonedas" y confeti
  // ===========================================================================

  private async animarRadicado(radicado: string): Promise<void> {
    const corte = radicado.lastIndexOf('-') + 1;
    const prefijo = radicado.slice(0, corte);
    const digitos = radicado.slice(corte);
    let fijo = prefijo;
    for (let i = 0; i < digitos.length; i++) {
      if (!this.movimientoReducido()) {
        for (let s = 0; s < 7 + i; s++) {
          this.radicadoVisible.set(fijo + String(Math.floor(Math.random() * 10)));
          await this.esperar(35);
        }
      }
      fijo += digitos[i];
      this.radicadoVisible.set(fijo);
      await this.esperar(60);
    }
  }

  /** Confeti con los colores de la plataforma, leídos de los tokens globales. */
  private lanzarConfeti(): void {
    const tarjeta = this.host.nativeElement.querySelector<HTMLElement>('.brok-exito');
    if (!tarjeta || this.movimientoReducido()) {
      return;
    }
    const estilos = getComputedStyle(document.documentElement);
    const colores = ['--color-accent', '--color-accent-hover', '--sb-primary-fixed', '--color-success'].map((t) =>
      estilos.getPropertyValue(t).trim(),
    );
    const r = tarjeta.getBoundingClientRect();
    for (let i = 0; i < 40; i++) {
      const pieza = document.createElement('div');
      pieza.className = 'brok-confeti';
      const tam = 4 + Math.random() * 5;
      Object.assign(pieza.style, {
        width: `${tam}px`,
        height: `${tam * (0.4 + Math.random() * 0.6)}px`,
        background: colores[i % colores.length],
        left: `${r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.7}px`,
        top: `${r.top + 30}px`,
      });
      this.host.nativeElement.appendChild(pieza);
      const animacion = pieza.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${(Math.random() - 0.5) * 220}px, ${260 + Math.random() * 220}px) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 0 },
        ],
        { duration: 1600 + Math.random() * 500, easing: 'cubic-bezier(.22,.61,.36,1)' },
      );
      animacion.onfinish = () => pieza.remove();
    }
  }

  // ===========================================================================
  // Utilidades de la guía
  // ===========================================================================

  /** Encadena acciones de Brok para que nunca se solapen. Un reinicio las cancela. */
  private encolar(accion: () => Promise<void>): void {
    const corrida = this.corrida;
    this.cola = this.cola
      .then(() => (this.corrida === corrida ? accion() : undefined))
      .catch((e: unknown) => {
        if (!(e instanceof Cancelado)) {
          console.error(e);
        }
      });
  }

  private esperar(ms: number): Promise<void> {
    const corrida = this.corrida;
    return new Promise((resolve, reject) =>
      setTimeout(() => (this.corrida === corrida ? resolve() : reject(new Cancelado())), ms),
    );
  }

  /** Espera una llamada al backend y la descarta si hubo reinicio mientras tanto. */
  private async llamar<T>(promesa: Promise<T>): Promise<T> {
    const corrida = this.corrida;
    const valor = await promesa;
    if (this.corrida !== corrida) {
      throw new Cancelado();
    }
    return valor;
  }

  private async escribir(texto: string, fijar: (valor: string) => void): Promise<void> {
    for (let i = 0; i <= texto.length; i++) {
      fijar(texto.slice(0, i));
      await this.esperar(45 + Math.random() * 35);
    }
  }

  private movimientoReducido(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private limpiarEfectos(): void {
    this.quitarFoco();
    this.posCursor = null;
    this.host.nativeElement.querySelectorAll('.brok-confeti').forEach((p) => p.remove());
  }

  private regla(tipo: TipoDocumentoRadicacion, obligatorio: boolean): ReglaDocumentoUploader {
    return {
      id: tipo,
      etiqueta: ETIQUETA_DOCUMENTO_RADICACION[tipo],
      descripcion: DESCRIPCION_DOCUMENTO_RADICACION[tipo],
      obligatorio,
    };
  }
}
