import type { PasoTour, PerfilTour } from '../models/onboarding.model';

/**
 * Guía de la gestión de una renovación (la pantalla que abre «Gestionar» en una póliza): explica cada modalidad. La
 * registra la propia vista (`GestionRenovacionComponent`).
 */
export const GUIA_RENOVACION: readonly PasoTour[] = [
  { icono: 'description', titulo: 'Los datos de tu póliza', texto: 'Arriba ves la póliza que vas a gestionar. Revisa su vencimiento antes de elegir cómo renovarla.' },
  { icono: 'bolt', titulo: 'Renovación digital', texto: 'La opción recomendada: renuevas en minutos y sin papel. Puedes dejar los mismos valores o ajustar el canon con el tope del IPC.' },
  { icono: 'draw', titulo: 'Renovación física', texto: 'Genera el formato oficial, fírmalo y cárgalo aquí. Úsala solo si el tomador exige firma en físico.' },
  { icono: 'assignment', titulo: 'Caso especial', texto: 'Para un Otro Sí o una Cesión: cuéntanos el caso y adjunta los documentos que lo respaldan.' },
  { icono: 'rule', titulo: 'Corrección de documentos', texto: 'Si te pedimos corregir algo, aquí cargas los documentos para que la solicitud siga su curso.' },
];

// --- Anclas comunes (selectores de elementos que existen en las vistas) ---
const MENU = ['app-sidebar nav', 'app-sidebar'];
const CIFRAS = ['app-grid-layout', 'app-kpi-card'];
const TABLA = ['app-data-table', 'app-estado-vista'];
const FILTROS = ['app-barra-acciones', 'app-segmented-control', 'app-filtrado-inteligente'];
const GESTIONAR = ['app-data-table .dt-fija', 'app-data-table'];
const VER_RECORRIDO = ['.sidebar__recorrido'];

const SEGUIMIENTO: readonly PasoTour[] = [
  { icono: 'dashboard', titulo: 'Así vendes una póliza', texto: 'El menú sigue el orden del trabajo: cotizas, generas el contrato, radicas y, cuando expedimos la póliza, cobras tu comisión.', objetivo: MENU },
  { icono: 'insights', titulo: 'Tus cifras', texto: 'Cuántas radicaciones tienes, cuáles estamos revisando y cuántas ya son póliza.', objetivo: ['.dash-kpis-grid', ...CIFRAS] },
  { icono: 'payments', titulo: 'Tu comisión', texto: 'Lo que tienes por cobrar según el libro de comisiones. Desde aquí llegas a tu cuenta de cobro.', objetivo: ['.dash-comm'] },
  { icono: 'filter_alt', titulo: 'Encuentra una radicación', texto: 'Filtra por estado, producto o fechas, o busca por cliente o número.', objetivo: ['.seg-filtros-grid'] },
  { icono: 'list_alt', titulo: 'En qué va cada radicación', texto: 'Con «Ver detalle» ves el avance, la comisión y lo que te pidamos corregir.', objetivo: TABLA },
  { icono: 'tour', titulo: 'Repite el recorrido', texto: 'Cada pantalla tiene su recorrido. Repítelo cuando quieras desde «Ver recorrido».', objetivo: VER_RECORRIDO },
];

const COTIZADOR: readonly PasoTour[] = [
  { icono: 'location_on', titulo: '1. El inmueble', texto: 'Elige el departamento, la ciudad y si es vivienda o comercio.', objetivo: ['app-form-section-card[titulo="Inmueble"]'] },
  { icono: 'payments', titulo: '2. Valores y vigencia', texto: 'Escribe el canon, la administración y la duración del contrato.', objetivo: ['app-form-section-card[titulo="Valores y vigencia"]'] },
  { icono: 'shield', titulo: '3. Coberturas adicionales', texto: 'Amplía daños y faltantes o servicios públicos si el propietario lo necesita.', objetivo: ['app-form-section-card:last-of-type', '#cotizador-form'] },
  { icono: 'calculate', titulo: 'El resultado', texto: 'Cuando termines de digitar, calcula: aquí ves el valor de la póliza y tu comisión estimada, y descargas el PDF para el propietario.', objetivo: ['.cotizador-datos__lateral'] },
];

const CONTRATO: readonly PasoTour[] = [
  { icono: 'linear_scale', titulo: 'Paso a paso', texto: 'El contrato se arma en pasos: propietario, inquilino, inmueble y condiciones. Puedes volver a cualquiera.', objetivo: ['app-step-tabs'] },
  { icono: 'edit_note', titulo: 'Los datos del paso', texto: 'Si tienes el estudio del inquilino, sus datos se llenan solos; revísalos antes de seguir.', objetivo: ['.contrato-paso'] },
  { icono: 'arrow_forward', titulo: 'Avanza', texto: 'Al final generamos el contrato con el formato autorizado de Proyectiva (vivienda o comercio) y lo descargas en Word o PDF para firmar.', objetivo: ['.contrato-acciones-nav', '.contrato-acciones'] },
];

const RADICACION: readonly PasoTour[] = [
  { icono: 'description', titulo: '1. El contrato', texto: 'Elige el contrato que generaste o carga el firmado: precargamos sus datos.', objetivo: ['app-form-section-card[titulo="Contrato de arrendamiento"]'] },
  { icono: 'person', titulo: '2. El propietario', texto: 'Confirma los datos del titular del inmueble.', objetivo: ['app-form-section-card[titulo="Datos del propietario"]'] },
  { icono: 'task_alt', titulo: '3. El estudio', texto: 'Consulta el estudio aprobado del inquilino. Si aún no lo tiene, te llevamos a El Libertador para solicitarlo.', objetivo: ['app-form-section-card[titulo="Estudio de arrendamiento"]'] },
  { icono: 'draw', titulo: '4. Quién firma', texto: 'El propietario o un apoderado, persona natural o jurídica.', objetivo: ['app-form-section-card[titulo="¿Quién firma el contrato?"]'] },
  { icono: 'verified_user', titulo: '5. Conocimiento de Cliente', texto: 'Descarga el formulario, haz que lo firme el propietario y cárgalo con los documentos.', objetivo: ['app-form-section-card[titulo="Validación de Conocimiento de Cliente"]'] },
  { icono: 'upload_file', titulo: '6. Documentos', texto: 'Carga cada documento en su fila; si un archivo no sirve, te lo decimos de inmediato.', objetivo: ['app-form-section-card[titulo="Documentos requeridos"]'] },
  { icono: 'send', titulo: 'Envía', texto: 'Aquí ves qué falta. Cuando todo esté completo, envía la radicación: nosotros la revisamos y expedimos la póliza.', objetivo: ['.radicacion__lateral'] },
];

const RENOVACIONES: readonly PasoTour[] = [
  { icono: 'insights', titulo: 'Tu portafolio', texto: 'Cuántas pólizas tienes, cuáles vencen pronto y cuáles ya renovaste.', objetivo: CIFRAS },
  { icono: 'filter_alt', titulo: 'Filtra', texto: 'Por vigencia o por número de póliza.', objetivo: FILTROS },
  { icono: 'autorenew', titulo: 'Renueva', texto: 'Primero las más urgentes. Con «Renovar» eliges cómo hacerlo; te explicamos cada opción.', objetivo: TABLA },
];

const COMISIONES: readonly PasoTour[] = [
  { icono: 'payments', titulo: 'Lo que tienes por cobrar', texto: 'Tus comisiones según el libro de comisiones y el acuerdo que tienes con nosotros.', objetivo: ['app-commission-breakdown-card', '.comisiones__kpis'] },
  { icono: 'checklist', titulo: '1. Elige tus pólizas', texto: 'Marca las pendientes de pago (hasta el máximo por cuenta). Las fuera de plazo se cobran en una cuenta aparte.', objetivo: ['app-form-section-card[titulo="Pólizas a cobrar"]'] },
  { icono: 'receipt_long', titulo: '2. Genera tu cuenta de cobro', texto: 'Revisa el total, genera la cuenta y descárgala para firmarla.', objetivo: ['app-summary-card[titulo="Cuenta de cobro"]'] },
  { icono: 'open_in_new', titulo: '3. Cárgala en la plataforma de proveedores', texto: 'Del 1 al 10 de cada mes; si te piden corregirla, tienes hasta el 15.', objetivo: ['.comisiones__acciones .comisiones__proveedores', 'app-summary-card[titulo="Cuenta de cobro"]'] },
  { icono: 'history', titulo: 'Tus cuentas generadas', texto: 'Descarga cualquier cuenta que ya generaste.', objetivo: ['app-form-section-card[titulo="Cuentas de cobro generadas"]'] },
];

const CALENDARIO: readonly PasoTour[] = [
  { icono: 'calendar_month', titulo: 'Tu mes', texto: 'Inicios de contratos, cotizaciones y vencimientos de pólizas. Hoy va en círculo.', objetivo: ['app-calendario-mensual'] },
  { icono: 'chevron_right', titulo: 'Cambia de mes', texto: 'Muévete entre meses para planear tus renovaciones.', objetivo: ['.calendario__nav', 'app-calendario-mensual'] },
];

const DOCUMENTOS: readonly PasoTour[] = [
  { icono: 'folder_open', titulo: 'Formatos y guías', texto: 'Los formatos oficiales para tus clientes, agrupados por tema.', objetivo: ['.doc-section'] },
  { icono: 'download', titulo: 'Descárgalos', texto: 'El botón dice si es Word o PDF.', objetivo: ['.doc-btn', '.doc-section'] },
];

const AYUDA: readonly PasoTour[] = [
  { icono: 'support_agent', titulo: 'Habla con nosotros', texto: 'Contactos directos para estudios, cobranzas y más.', objetivo: ['.contact-cards'] },
  { icono: 'quiz', titulo: 'Preguntas frecuentes', texto: 'Las respuestas a las dudas más comunes; se abren de a una.', objetivo: ['.faq-list'] },
];

const PERFIL_BROKER: readonly PasoTour[] = [
  { icono: 'person', titulo: 'Tus datos', texto: 'Mantén al día tu contacto, tu ciudad y tu cuenta para pagos.', objetivo: ['.perfil-rejilla', '.perfil-tarjeta'] },
  { icono: 'upload_file', titulo: 'Tus documentos', texto: 'Carga o actualiza tus documentos; revisamos cada archivo nuevo.', objetivo: ['.perfil-docs'] },
];

const PERFIL_PROSPECTO: readonly PasoTour[] = [
  { icono: 'verified', titulo: 'Conviértete en broker', texto: 'Te faltan estos pasos para que te aprobemos.', objetivo: ['.perfil-pasos', '.perfil-tarjeta'] },
  { icono: 'upload_file', titulo: 'Tus documentos', texto: 'Tus 4 documentos y el formulario de Conocimiento de Cliente diligenciado y firmado.', objetivo: ['.perfil-docs'] },
  { icono: 'payments', titulo: 'Tus comisiones como prospecto', texto: 'Las pólizas que expidas mientras tanto se cobran al aprobarte.', objetivo: ['.perfil-comisiones'] },
];

function consola(perfil: 'ADMINISTRADOR' | 'COMERCIAL'): Readonly<Record<string, readonly PasoTour[]>> {
  const admin = perfil === 'ADMINISTRADOR';
  return {
    '/admin/resumen': [
      { icono: 'monitoring', titulo: admin ? 'El negocio de un vistazo' : 'Tu cartera de un vistazo', texto: admin ? 'Primas, pólizas, brokers y comisiones.' : 'Acompañas a tus brokers para que sus negocios lleguen a póliza.', objetivo: CIFRAS },
      { icono: 'groups', titulo: 'Quién produce', texto: 'Los brokers con más producción.', objetivo: TABLA },
      { icono: 'menu', titulo: 'El menú', texto: admin ? 'Prospectos, negocios, brokers, comerciales, cuentas de cobro y renovaciones.' : 'Tus brokers, prospectos, negocios, cuentas de cobro y renovaciones.', objetivo: MENU },
      { icono: 'tour', titulo: 'Repite el recorrido', texto: 'Cada pantalla tiene su recorrido. Repítelo desde «Ver recorrido».', objetivo: VER_RECORRIDO },
    ],
    '/admin/prospectos': [
      { icono: 'insights', titulo: 'Prospectos', texto: admin ? 'Cuántos están por aprobar y en qué van.' : 'Tus prospectos y lo que les falta para que los aprobemos.', objetivo: CIFRAS },
      { icono: 'list_alt', titulo: 'Cada prospecto', texto: 'Contacto, legalización, documentos y Conocimiento de Cliente.', objetivo: TABLA },
      { icono: 'how_to_reg', titulo: 'Gestionar', texto: admin ? 'Revisa sus documentos y, antes de aprobar, verifica el correo al que enviaremos el acceso.' : 'Mira qué le falta y ayúdale a completarlo.', objetivo: GESTIONAR },
    ],
    '/admin/negocios': [
      { icono: 'insights', titulo: 'Negocios', texto: 'En curso, expedidos y primas emitidas.', objetivo: CIFRAS },
      { icono: 'filter_alt', titulo: 'Filtra por etapa', texto: admin ? 'Por estado del negocio.' : 'Revisa cada día los que están en corrección o sin movimiento.', objetivo: FILTROS },
      { icono: 'edit_note', titulo: 'Gestionar', texto: admin ? 'Notas, corrección de documentos y reasignación del negocio a otro comercial.' : 'Deja una nota al broker o corrige sus documentos y devuélvelo a validación. Tu ayuda queda registrada.', objetivo: GESTIONAR },
    ],
    '/admin/brokers': [
      { icono: 'insights', titulo: admin ? 'Brokers' : 'Mis brokers', texto: 'Cuántos hay y cuánto producen.', objetivo: CIFRAS },
      { icono: 'list_alt', titulo: 'Cada broker', texto: admin ? 'Acuerdo de comisión, comercial y actividad.' : 'Su producción, sus negocios y su actividad, para saber a quién apoyar.', objetivo: TABLA },
      { icono: 'manage_accounts', titulo: 'Gestionar', texto: admin ? 'Cambia el acuerdo, reasigna el comercial o corrige el correo de acceso. Cada cambio pide confirmación y queda registrado.' : 'Ve su actividad completa.', objetivo: GESTIONAR },
    ],
    '/admin/comerciales': [
      { icono: 'badge', titulo: 'Comerciales', texto: 'Cuántos están activos y su cartera.', objetivo: CIFRAS },
      { icono: 'manage_accounts', titulo: 'Gestionar', texto: 'Crea comerciales, dales acceso o desactívalos; si tienen cartera te avisamos para reasignarla.', objetivo: GESTIONAR },
    ],
    '/admin/comisiones': [
      { icono: 'receipt_long', titulo: 'Cuentas de cobro', texto: admin ? 'Las cuentas que generan los brokers. El pago se confirma en el libro de comisiones.' : 'Las cuentas que generan tus brokers.', objetivo: CIFRAS },
      { icono: 'download', titulo: 'Ver documento', texto: 'Abre cualquier cuenta para revisarla.', objetivo: TABLA },
    ],
    '/admin/renovaciones': [
      { icono: 'sync', titulo: 'Renovaciones del Warehouse', texto: 'Las renovaciones de la cartera y la fecha de la última actualización.', objetivo: ['.ren-sincronizacion', ...CIFRAS] },
      { icono: 'filter_alt', titulo: 'Filtra', texto: 'Por estado o casos especiales.', objetivo: FILTROS },
      { icono: 'autorenew', titulo: 'Gestionar', texto: admin ? 'Historial, cadena de gestión y documentos de cada renovación.' : 'Si una está en corrección, puedes reemplazar sus documentos.', objetivo: GESTIONAR },
    ],
  };
}

const BROKER: Readonly<Record<string, readonly PasoTour[]>> = {
  '/app/seguimiento': SEGUIMIENTO,
  '/app/cotizador': COTIZADOR,
  '/app/contrato': CONTRATO,
  '/app/radicacion': RADICACION,
  '/app/renovaciones': RENOVACIONES,
  '/app/comisiones': COMISIONES,
  '/app/calendario': CALENDARIO,
  '/app/documentos': DOCUMENTOS,
  '/app/ayuda': AYUDA,
  '/app/perfil': PERFIL_BROKER,
};

/** Recorrido de cada vista por perfil: se abre solo la primera vez en esa vista y se repite desde «Ver recorrido». */
export const RECORRIDOS_POR_VISTA: Readonly<Record<PerfilTour, Readonly<Record<string, readonly PasoTour[]>>>> = {
  BROKER,
  PROSPECTO: { ...BROKER, '/app/perfil': PERFIL_PROSPECTO },
  ADMINISTRADOR: consola('ADMINISTRADOR'),
  COMERCIAL: consola('COMERCIAL'),
};

/** Recorrido de la vista (ruta sin parámetros) para el perfil; vacío si la vista no tiene. */
export function recorridoDeVista(perfil: PerfilTour, ruta: string): readonly PasoTour[] {
  return RECORRIDOS_POR_VISTA[perfil][ruta.split('?')[0].split('#')[0]] ?? [];
}
