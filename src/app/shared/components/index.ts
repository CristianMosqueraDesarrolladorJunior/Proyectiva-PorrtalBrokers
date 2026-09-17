/**
 * Barrel de la Librería de Componentes Compartidos (Req 24, 35).
 * Reexporta los Componentes_Compartidos standalone tokenizados para un
 * import consistente desde las features.
 */
export { BotonComponent } from './boton/boton.component';
export type { VarianteBoton, TipoBoton } from './boton/boton.component';

export { BadgeEstadoComponent } from './badge-estado/badge-estado.component';
export type { VarianteBadge } from './badge-estado/badge-estado.component';

export { FormFieldComponent } from './form-field/form-field.component';

export { GridLayoutComponent } from './grid-layout/grid-layout.component';
export type { TipoGrid } from './grid-layout/grid-layout.component';

export { CardComponent } from './card/card.component';
export type { VarianteCard } from './card/card.component';

export { DataTableComponent } from './data-table/data-table.component';
export type {
  ColumnaTabla,
  FilaTabla,
  AccionFila,
  DireccionOrden,
} from './data-table/data-table.component';
export { ToggleSwitchComponent } from './toggle-switch/toggle-switch.component';
export { DocUploaderComponent } from './doc-uploader/doc-uploader.component';
export type {
  ReglaDocumentoUploader,
  ArchivoSeleccionado,
} from './doc-uploader/doc-uploader.component';
export { StepperComponent } from './stepper/stepper.component';
export { TabsComponent } from './tabs/tabs.component';
export { RadioGroupComponent } from './radio-group/radio-group.component';

// --- Librería de Componentes Compartidos — parte 2 (Task 5.1) ---

export { AlertBannerComponent } from './alert-banner/alert-banner.component';
export type { VarianteAlerta } from './alert-banner/alert-banner.component';

export { EscaleritaLoaderComponent } from './escalerita-loader/escalerita-loader.component';

export { InfoBoxComponent } from './info-box/info-box.component';
export { InfoPanelComponent } from './info-box/info-panel.component';

export { SuccessScreenComponent } from './success-screen/success-screen.component';
export type {
  VarianteIconoExito,
  TarjetaSeguimiento,
} from './success-screen/success-screen.component';

export { ResultadoSarlaftTableComponent } from './resultado-sarlaft-table/resultado-sarlaft-table.component';

export { QuickToolBannerComponent } from './quick-tool-banner/quick-tool-banner.component';

export { FiltradoInteligenteComponent } from './filtrado-inteligente/filtrado-inteligente.component';

// --- Librería de Componentes Compartidos — parte 2 (Tasks 5.2, 5.4) ---

export { FaqAccordionComponent } from './faq-accordion/faq-accordion.component';
export type { PreguntaFrecuente } from './faq-accordion/faq-accordion.component';

export { CalendarioMensualComponent } from './calendario-mensual/calendario-mensual.component';
export type { EventoCalendario } from './calendario-mensual/calendario-mensual.component';

export { TimelineComponent } from './timeline/timeline.component';
export type { HitoTimeline } from './timeline/timeline.component';

export { DrawerDetalleComponent } from './drawer-detalle/drawer-detalle.component';
export type { FilaDetalle } from './drawer-detalle/drawer-detalle.component';

export { ChatAsistenteComponent } from './chat-asistente/chat-asistente.component';
