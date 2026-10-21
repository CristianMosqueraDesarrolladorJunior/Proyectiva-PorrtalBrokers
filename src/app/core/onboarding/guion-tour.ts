import type { GuionTour, PasoTour, PerfilTour } from '../models/onboarding.model';

/**
 * Guía de la gestión de una renovación (la pantalla que abre «Gestionar» en una póliza): explica cada modalidad. Sus
 * pasos no navegan; hablan de lo que el usuario ve en esa pantalla.
 */
export const GUIA_RENOVACION: readonly PasoTour[] = [
  { icono: 'description', titulo: 'Los datos de tu póliza', texto: 'Arriba ves la póliza que vas a gestionar. Revisa su vencimiento antes de elegir cómo renovarla.' },
  { icono: 'bolt', titulo: 'Renovación digital', texto: 'La opción recomendada: renuevas en minutos y sin papel. Puedes dejar los mismos valores o ajustar el canon con el tope del IPC.' },
  { icono: 'draw', titulo: 'Renovación física', texto: 'Genera el formato oficial, fírmalo y cárgalo aquí. Úsala solo si el tomador exige firma en físico.' },
  { icono: 'assignment', titulo: 'Caso especial', texto: 'Para un Otro Sí o una Cesión: cuéntanos el caso y adjunta los documentos que lo respaldan.' },
  { icono: 'rule', titulo: 'Corrección de documentos', texto: 'Si te pedimos corregir algo, aquí cargas los documentos para que la solicitud siga su curso.' },
];

/**
 * Recorrido por la plataforma, vista por vista: cada paso lleva a una pantalla real (`ruta`) y dice en una frase qué se
 * hace allí. Cada perfil recorre solo lo que puede usar (Manual de la plataforma). Tono cercano, en segunda persona.
 */
export const GUIONES_TOUR: Readonly<Record<PerfilTour, GuionTour>> = {
  ADMINISTRADOR: {
    perfil: 'ADMINISTRADOR',
    pasos: [
      { ruta: '/admin/resumen', icono: 'monitoring', titulo: 'Resumen', texto: 'Todo el negocio de un vistazo: primas, pólizas, brokers y comisiones.' },
      { ruta: '/admin/brokers', icono: 'groups', titulo: 'Brokers', texto: 'Contacto, comercial, acuerdo de comisión (20 % o 25 %) y producción de cada broker.' },
      { ruta: '/admin/negocios', icono: 'description', titulo: 'Negocios', texto: 'Cada negocio con su inquilino, inmueble y el procedimiento en el área.' },
      { ruta: '/admin/comerciales', icono: 'badge', titulo: 'Comerciales', texto: 'Crea comerciales y dales acceso; cada uno ve solo su cartera.' },
      { ruta: '/admin/prospectos', icono: 'how_to_reg', titulo: 'Prospectos', texto: 'Revisa documentos, califica el Conocimiento de Cliente y aprueba a quien pasa a broker.' },
      { ruta: '/admin/polizas', icono: 'policy', titulo: 'Pólizas', texto: 'Cada póliza con su prima, su comisión y su cuenta de cobro.' },
      { ruta: '/admin/comisiones', icono: 'payments', titulo: 'Comisiones', texto: 'Las cuentas de cobro (documentos) que generan los brokers.' },
    ],
  },
  COMERCIAL: {
    perfil: 'COMERCIAL',
    pasos: [
      { ruta: '/admin/resumen', icono: 'monitoring', titulo: 'Mi resumen', texto: 'El resumen de los brokers y prospectos que acompañas.' },
      { ruta: '/admin/brokers', icono: 'groups', titulo: 'Mis brokers', texto: 'Su producción y sus negocios, para saber a quién apoyar.' },
      { ruta: '/admin/prospectos', icono: 'how_to_reg', titulo: 'Mis prospectos', texto: 'Sigue su avance en el registro; el administrador los aprueba.' },
      { ruta: '/admin/negocios', icono: 'description', titulo: 'Negocios', texto: 'Cómo avanzan las radicaciones de tu cartera.' },
      { ruta: '/admin/polizas', icono: 'policy', titulo: 'Pólizas', texto: 'Las pólizas de tu cartera y su comisión.' },
      { ruta: '/admin/comisiones', icono: 'payments', titulo: 'Comisiones', texto: 'Las cuentas de cobro que generan los brokers de tu cartera.' },
    ],
  },
  BROKER: {
    perfil: 'BROKER',
    pasos: [
      { ruta: '/app/seguimiento', icono: 'dashboard', titulo: 'Seguimiento', texto: 'Tus radicaciones, su estado y tu comisión pendiente. Desde «Ver detalle» revisas cotización, contrato y documentos.' },
      { ruta: '/app/cotizador', icono: 'calculate', titulo: 'Cotizador', texto: 'Calcula la póliza ideal en segundos y compártela con el propietario en PDF.' },
      { ruta: '/app/contrato', icono: 'description', titulo: 'Contratos', texto: 'Genera el contrato de arrendamiento y descárgalo en PDF o Word.' },
      { ruta: '/app/radicacion', icono: 'post_add', titulo: 'Radicación', texto: 'Radica la solicitud con sus documentos y nosotros expedimos la póliza.' },
      { ruta: '/app/comisiones', icono: 'payments', titulo: 'Comisiones', texto: 'Revisa tus pólizas recaudadas y genera tu cuenta de cobro; el cobro lo haces en la plataforma de proveedores.' },
      { ruta: '/app/renovaciones', icono: 'autorenew', titulo: 'Renovaciones', texto: 'Tus pólizas ordenadas por urgencia: primero las que vencen pronto.' },
      // Entra a la primera póliza por renovar y explica cada opción de esa pantalla.
      { abrir: 'primeraRenovacion', icono: 'touch_app', titulo: 'Gestiona tu primera renovación', texto: 'Con «Renovar» entras a una póliza. Así se ve su gestión:' },
      ...GUIA_RENOVACION,
    ],
  },
  PROSPECTO: {
    perfil: 'PROSPECTO',
    pasos: [
      { ruta: '/app/seguimiento', icono: 'dashboard', titulo: 'Seguimiento', texto: 'Consulta el avance de cada radicación y gestiona lo que te pidamos.' },
      { ruta: '/app/cotizador', icono: 'calculate', titulo: 'Cotizador', texto: 'Calcula la póliza ideal en segundos y compártela con el propietario.' },
      { ruta: '/app/contrato', icono: 'description', titulo: 'Contratos', texto: 'Genera el contrato de arrendamiento en PDF o Word.' },
      { ruta: '/app/radicacion', icono: 'post_add', titulo: 'Radicación', texto: 'Radica la solicitud con sus documentos; la revisamos y expedimos la póliza.' },
      { ruta: '/app/perfil', icono: 'verified', titulo: 'Conviértete en broker', texto: 'Completa tu registro aquí. Al aprobarte desbloqueas comisiones, renovaciones y calendario.' },
    ],
  },
};

/** Guion del perfil; la selección vive aquí y no dentro del componente. */
export function guionDePerfil(perfil: PerfilTour): GuionTour {
  return GUIONES_TOUR[perfil];
}
