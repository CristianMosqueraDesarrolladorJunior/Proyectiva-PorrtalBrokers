import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Contacto directo de soporte del prototipo (Req 33.5). */
interface ContactoDirecto {
  readonly avatar: string;
  readonly nombre: string;
  readonly disponible: boolean;
  readonly descripcion: string;
}

/** Pregunta frecuente de comercialización (Req 33.6). */
interface FaqItem {
  readonly pregunta: string;
  readonly respuesta: string;
}

/**
 * Centro de ayuda (Req 33.5, 33.6).
 *
 * Replica fielmente el prototipo: "Contactos directos" (contact-cards con avatar,
 * estado Disponible y "Conectar ahora"), "Canales oficiales" (Portal PQRS) y
 * "Preguntas frecuentes de comercialización" (acordeón `details/summary`).
 */
@Component({
  selector: 'app-ayuda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ayuda.component.html',
  styleUrl: './ayuda.component.scss',
})
export class AyudaComponent {
  /** URL del portal PQRS oficial. */
  protected readonly pqrsUrl = 'https://www.segurosbolivar.com/pqrs';

  /** Contactos directos del prototipo (Req 33.5). */
  protected readonly contactos: readonly ContactoDirecto[] = [
    {
      avatar: '👩‍💼',
      nombre: 'Victoria · Estudios',
      disponible: true,
      descripcion:
        'Especialista en estudios de aseguramiento, análisis de riesgo y viabilidad.',
    },
    {
      avatar: '👨‍💼',
      nombre: 'Eli · Cobranzas',
      disponible: true,
      descripcion:
        'Especialista en gestión de cobranzas, cuotas y estados de cuenta.',
    },
  ];

  /** Preguntas frecuentes de comercialización del prototipo (Req 33.6). */
  protected readonly faqs: readonly FaqItem[] = [
    {
      pregunta: '¿Cuáles son los requisitos para comercializar pólizas de arrendamiento?',
      respuesta:
        'Debes estar acreditado como broker activo con Seguros Bolívar, completar la formación oficial, tener acceso al portal y estar al día con SARLAFT anual. Cada solicitud requiere estudio de aseguramiento.',
    },
    {
      pregunta: '¿Qué documentos necesito para radicar una nueva póliza?',
      respuesta:
        'Natural: cédula del propietario y certificado de tradición. Jurídica: certificado de existencia (≤30 días), cédula del RL y formulario SARLAFT. Se recomienda contrato firmado.',
    },
    {
      pregunta: '¿Cómo se calcula la comisión del broker?',
      respuesta:
        'Comisión estándar: 8% sobre prima neta anual. Pólizas > $9M mensuales: tasa 3.0%. Menores: 3.5%. Consulta el instructivo en Documentos.',
    },
    {
      pregunta: '¿Cuánto tiempo demora el estudio de una póliza?',
      respuesta:
        'Natural sin novedades: 6 horas hábiles. Jurídica o con requerimientos: hasta 24 horas. Consulta estado en Seguimiento.',
    },
    {
      pregunta: '¿Cómo funciona el proceso de renovación?',
      respuesta:
        'Se gestiona vía formulario en Renovaciones. Busca por cédula y diligencia. Si no desea renovar, notifica a renovacionesarrendamiento@segurosbolivar.com.',
    },
    {
      pregunta: '¿Puedo cotizar sin tener todos los datos del inmueble?',
      respuesta:
        'Sí. El cotizador genera valores estimados con info básica: tipo de inmueble, canon, administración y coberturas. El valor final puede variar tras estudio.',
    },
    {
      pregunta: '¿Qué hago si el cliente presenta una reclamación?',
      respuesta:
        'Consulta el "Instructivo de reclamación" en Documentos. Ante dudas, conecta con Victoria (Estudios) o radica en PQRS.',
    },
  ];

  /** trackBy de contactos. */
  protected trackContacto(_i: number, contacto: ContactoDirecto): string {
    return contacto.nombre;
  }

  /** trackBy de FAQs. */
  protected trackFaq(_i: number, faq: FaqItem): string {
    return faq.pregunta;
  }
}
