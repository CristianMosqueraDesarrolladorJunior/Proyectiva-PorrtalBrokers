import { HttpClient } from '@angular/common/http';
import { Injector, type Provider } from '@angular/core';

import { CatalogoService, type Catalogos } from '../app/core/services/catalogo.service';

/**
 * Catálogos de prueba: copia de `GET /api/v1/catalogos` contra la BD local (V62). Las pruebas los cargan con
 * `TestBed.inject(CatalogoService).usar(CATALOGOS_PRUEBA)`; así el front se prueba con los mismos valores reales.
 */
export const CATALOGOS_PRUEBA = {
  "tablas": {
    "acuerdo_comision": [
      {
        "codigo": "20",
        "descripcion": "20 %"
      },
      {
        "codigo": "25",
        "descripcion": "25 %"
      }
    ],
    "canal_pqr": [
      {
        "codigo": "PORTAL",
        "descripcion": "Portal de autogestión"
      },
      {
        "codigo": "CORREO",
        "descripcion": "Correo electrónico"
      },
      {
        "codigo": "TELEFONO",
        "descripcion": "Teléfono"
      },
      {
        "codigo": "PRESENCIAL",
        "descripcion": "Presencial"
      },
      {
        "codigo": "CONTACT_CENTER",
        "descripcion": "Contact Center"
      }
    ],
    "ciudad": [
      {
        "codigo": "BOGOTA",
        "descripcion": "Bogotá D.C.",
        "departamento": "Cundinamarca"
      },
      {
        "codigo": "MEDELLIN",
        "descripcion": "Medellín",
        "departamento": "Antioquia"
      },
      {
        "codigo": "CALI",
        "descripcion": "Cali",
        "departamento": "Valle del Cauca"
      },
      {
        "codigo": "BARRANQUILLA",
        "descripcion": "Barranquilla",
        "departamento": "Atlántico"
      },
      {
        "codigo": "CARTAGENA",
        "descripcion": "Cartagena",
        "departamento": "Bolívar"
      },
      {
        "codigo": "BUCARAMANGA",
        "descripcion": "Bucaramanga",
        "departamento": "Santander"
      },
      {
        "codigo": "PEREIRA",
        "descripcion": "Pereira",
        "departamento": "Risaralda"
      },
      {
        "codigo": "MANIZALES",
        "descripcion": "Manizales",
        "departamento": "Caldas"
      },
      {
        "codigo": "CUCUTA",
        "descripcion": "Cúcuta",
        "departamento": "Norte de Santander"
      },
      {
        "codigo": "IBAGUE",
        "descripcion": "Ibagué",
        "departamento": "Tolima"
      },
      {
        "codigo": "SANTA_MARTA",
        "descripcion": "Santa Marta",
        "departamento": "Magdalena"
      },
      {
        "codigo": "VILLAVICENCIO",
        "descripcion": "Villavicencio",
        "departamento": "Meta"
      },
      {
        "codigo": "ARMENIA",
        "descripcion": "Armenia",
        "departamento": "Quindío"
      },
      {
        "codigo": "PASTO",
        "descripcion": "Pasto",
        "departamento": "Nariño"
      },
      {
        "codigo": "MONTERIA",
        "descripcion": "Montería",
        "departamento": "Córdoba"
      }
    ],
    "cobertura": [
      {
        "codigo": "ARRENDAMIENTO",
        "descripcion": "Arrendamiento",
        "monto_defecto": 0.0,
        "paso_monto": 500000.0,
        "detalle": null,
        "destacado": null,
        "adicional": false
      },
      {
        "codigo": "DANOS_FALTANTES",
        "descripcion": "Daños y faltantes",
        "monto_defecto": 0.0,
        "paso_monto": 500000.0,
        "detalle": "Si a la desocupación del inmueble quedan daños o faltantes de inventario que hacen parte integral del inmueble, cubrimos el costo de reparación.\nReporta la situación dentro de los 90 días siguientes a la salida del inquilino, junto con el inventario firmado y las fotos.\nEl valor asegurable se amplía en pasos de $500.000; la prima adicional es del 5% por cada millón asegurado (mínimo $1.000.000).",
        "destacado": "Te recomendamos tener tu inventario al día.",
        "adicional": true
      },
      {
        "codigo": "SERVICIOS_PUBLICOS",
        "descripcion": "Servicios públicos",
        "monto_defecto": 1000000.0,
        "paso_monto": 500000.0,
        "detalle": "Si el inquilino entrega el inmueble y deja facturas pendientes de agua, luz y gas, asumimos el pago. En Vivienda te obsequiamos $1.000.000 y en Comercio $2.000.000.\nPuedes ampliar esta cobertura: la prima adicional es del 5% por cada millón asegurado por encima del monto obsequiado.\nSolo necesitas avisarnos durante los tres primeros meses tras la entrega del inmueble, adjuntar las facturas originales con la deuda y la constancia de salida.",
        "destacado": "Con estos documentos nos encargamos del reembolso correspondiente (no cubrimos reconexiones).",
        "adicional": true
      },
      {
        "codigo": "RESPONSABILIDAD_CIVIL",
        "descripcion": "Responsabilidad civil",
        "monto_defecto": 0.0,
        "paso_monto": 500000.0,
        "detalle": null,
        "destacado": null,
        "adicional": false
      },
      {
        "codigo": "DESEMPLEO",
        "descripcion": "Amparo por desempleo",
        "monto_defecto": 0.0,
        "paso_monto": 500000.0,
        "detalle": null,
        "destacado": null,
        "adicional": false
      }
    ],
    "codigo_pais": [
      {
        "codigo": "+57",
        "descripcion": "Colombia"
      },
      {
        "codigo": "+1",
        "descripcion": "Estados Unidos / Canadá"
      },
      {
        "codigo": "+52",
        "descripcion": "México"
      },
      {
        "codigo": "+54",
        "descripcion": "Argentina"
      },
      {
        "codigo": "+56",
        "descripcion": "Chile"
      },
      {
        "codigo": "+51",
        "descripcion": "Perú"
      },
      {
        "codigo": "+593",
        "descripcion": "Ecuador"
      },
      {
        "codigo": "+58",
        "descripcion": "Venezuela"
      },
      {
        "codigo": "+55",
        "descripcion": "Brasil"
      },
      {
        "codigo": "+507",
        "descripcion": "Panamá"
      }
    ],
    "contacto_ayuda": [
      {
        "codigo": "ESTUDIOS",
        "descripcion": "Victoria · Estudios",
        "detalle": "Especialista en estudios de aseguramiento, análisis de riesgo y viabilidad.",
        "tipo": "directo",
        "url": "https://www.ellibertador.co/contactanos",
        "icono": "👩‍💼"
      },
      {
        "codigo": "COBRANZAS",
        "descripcion": "Eli · Cobranzas",
        "detalle": "Especialista en gestión de cobranzas, cuotas y estados de cuenta (WhatsApp).",
        "tipo": "directo",
        "url": "https://wa.me/573144065758",
        "icono": "👨‍💼"
      },
      {
        "codigo": "PQRS",
        "descripcion": "Portal PQRS",
        "detalle": "Radica peticiones, quejas, reclamos, sugerencias o felicitaciones",
        "tipo": "oficial",
        "url": "https://www.segurosbolivar.com/pqrs",
        "icono": "📨"
      },
      {
        "codigo": "PROVEEDORES",
        "descripcion": "Plataforma de proveedores Seguros Bolívar",
        "detalle": "Carga aquí la cuenta de cobro generada en el portal para el pago de tus comisiones",
        "tipo": "oficial",
        "url": "https://bircfe.bolnet.com.co/auth/proveedores/login",
        "icono": "💳"
      }
    ],
    "destino_inmueble": [
      {
        "codigo": "VIVIENDA",
        "descripcion": "Vivienda",
        "producto_id": 1
      },
      {
        "codigo": "COMERCIO",
        "descripcion": "Comercio",
        "producto_id": 2
      }
    ],
    "documento_legalizacion": [
      {
        "codigo": "documentoIdentidad",
        "descripcion": "Documento de Identidad",
        "ayuda": "Documento de identidad del solicitante",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      },
      {
        "codigo": "certificacionBancaria",
        "descripcion": "Certificación Bancaria",
        "ayuda": "No mayor a 30 días",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": 30
      },
      {
        "codigo": "autorizacionPago",
        "descripcion": "Autorización de Pago",
        "ayuda": "Formato PDF o Imagen (Máx 5MB)",
        "tamano_max_bytes": 5242880,
        "vigencia_max_dias": null
      },
      {
        "codigo": "rut",
        "descripcion": "RUT",
        "ayuda": "Registro Único Tributario actualizado",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      }
    ],
    "documento_radicacion": [
      {
        "codigo": "cedulaPropietario",
        "descripcion": "Cédula del propietario",
        "tipo_doc_warehouse": "Cédula",
        "aplica": "NATURAL",
        "ayuda": "Documento de identidad del propietario del inmueble",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      },
      {
        "codigo": "certificadoTradicion",
        "descripcion": "Certificado de Tradición y Libertad",
        "tipo_doc_warehouse": "CTL",
        "aplica": "NATURAL",
        "ayuda": "Vigencia no mayor a 90 días",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": 90
      },
      {
        "codigo": "certificadoExistencia",
        "descripcion": "Certificado de existencia y representación legal",
        "tipo_doc_warehouse": "Certificacion",
        "aplica": "JURIDICA",
        "ayuda": "Vigencia no mayor a 30 días",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": 30
      },
      {
        "codigo": "cedulaRepresentanteLegal",
        "descripcion": "Cédula del Representante Legal",
        "tipo_doc_warehouse": "Cédula",
        "aplica": "JURIDICA",
        "ayuda": "Documento de identidad del representante legal",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      },
      {
        "codigo": "formularioSarlaft",
        "descripcion": "Formulario Conocimiento de Cliente (SARLAFT)",
        "tipo_doc_warehouse": "SARLAFT",
        "aplica": "JURIDICA",
        "ayuda": "Formulario Conocimiento de Cliente 4.0 diligenciado",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      },
      {
        "codigo": "poderApoderado",
        "descripcion": "Poder del apoderado",
        "tipo_doc_warehouse": "Poder Autorización",
        "aplica": "APODERADO",
        "ayuda": "Poder que faculta al apoderado para firmar",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      },
      {
        "codigo": "cedulaApoderado",
        "descripcion": "Cédula del apoderado",
        "tipo_doc_warehouse": "Cédula Apoderado",
        "aplica": "APODERADO",
        "ayuda": "Documento de identidad del apoderado",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      },
      {
        "codigo": "contratoArrendamientoFirmado",
        "descripcion": "Contrato de arrendamiento firmado",
        "tipo_doc_warehouse": "Contrato",
        "aplica": "OPCIONAL",
        "ayuda": "Opcional — Formato PDF o imagen",
        "tamano_max_bytes": 10485760,
        "vigencia_max_dias": null
      }
    ],
    "duracion_contrato": [
      {
        "codigo": "12",
        "descripcion": "12 meses"
      },
      {
        "codigo": "24",
        "descripcion": "24 meses"
      },
      {
        "codigo": "36",
        "descripcion": "36 meses"
      }
    ],
    "estado_cuenta": [
      {
        "codigo": "PROSPECTO",
        "descripcion": "Prospecto"
      },
      {
        "codigo": "REGISTRADO",
        "descripcion": "Broker registrado"
      }
    ],
    "estado_documento_registro": [
      {
        "codigo": "PENDIENTE",
        "descripcion": "Pendiente"
      },
      {
        "codigo": "EN_REVISION",
        "descripcion": "En revisión"
      },
      {
        "codigo": "APROBADO",
        "descripcion": "Aprobado"
      }
    ],
    "estado_estudio": [
      {
        "codigo": "pendiente",
        "descripcion": "Pendiente"
      },
      {
        "codigo": "aprobado",
        "descripcion": "Aprobado"
      },
      {
        "codigo": "no_aprobado",
        "descripcion": "No aprobado"
      }
    ],
    "estado_pago_comision": [
      {
        "codigo": "sin_cobrar",
        "descripcion": "Sin cuenta de cobro"
      },
      {
        "codigo": "pendiente",
        "descripcion": "Pago pendiente"
      },
      {
        "codigo": "pagada",
        "descripcion": "Pagada al broker"
      },
      {
        "codigo": "rechazada",
        "descripcion": "Rechazada"
      }
    ],
    "estado_poliza": [
      {
        "codigo": "VIGENTE",
        "descripcion": "Vigente",
        "renovable": false
      },
      {
        "codigo": "PROXIMA_A_RENOVAR",
        "descripcion": "Próxima a renovar",
        "renovable": true
      },
      {
        "codigo": "A_PUNTO_DE_VENCER",
        "descripcion": "A punto de vencer",
        "renovable": true
      },
      {
        "codigo": "RENOVADA",
        "descripcion": "Renovada",
        "renovable": false
      }
    ],
    "estado_pqr": [
      {
        "codigo": "ABIERTA",
        "descripcion": "Abierta"
      },
      {
        "codigo": "EN_GESTION",
        "descripcion": "En gestión"
      },
      {
        "codigo": "RESUELTA",
        "descripcion": "Resuelta"
      },
      {
        "codigo": "CERRADA",
        "descripcion": "Cerrada"
      }
    ],
    "estado_referido": [
      {
        "codigo": "ACEPTADA",
        "descripcion": "Aceptada"
      },
      {
        "codigo": "EN_PROCESO",
        "descripcion": "En proceso"
      },
      {
        "codigo": "RECHAZADA",
        "descripcion": "Rechazada"
      }
    ],
    "estado_registro_broker": [
      {
        "codigo": "RADICADA",
        "descripcion": "Solicitud de registro radicada"
      },
      {
        "codigo": "EN_REVISION",
        "descripcion": "En revisión de cumplimiento"
      },
      {
        "codigo": "APROBADA",
        "descripcion": "Aprobada — broker registrado"
      },
      {
        "codigo": "RECHAZADA",
        "descripcion": "Rechazada"
      },
      {
        "codigo": "SIN_SOLICITUD",
        "descripcion": "Operando sin solicitud de registro"
      }
    ],
    "estado_renovacion": [
      {
        "codigo": "pendiente",
        "descripcion": "Pendiente"
      },
      {
        "codigo": "en_gestion",
        "descripcion": "En gestión"
      },
      {
        "codigo": "caso_especial",
        "descripcion": "Caso especial"
      },
      {
        "codigo": "renovada",
        "descripcion": "Renovada"
      },
      {
        "codigo": "no_renovada",
        "descripcion": "No renovada"
      }
    ],
    "estado_solicitud": [
      {
        "codigo": "RADICADA",
        "descripcion": "Radicada",
        "final": false
      },
      {
        "codigo": "EN_GESTION",
        "descripcion": "En gestión",
        "final": false
      },
      {
        "codigo": "PENDIENTE_DOCUMENTOS",
        "descripcion": "Pendiente de documentos",
        "final": false
      },
      {
        "codigo": "EN_CORRECCION",
        "descripcion": "En corrección documental",
        "final": false
      },
      {
        "codigo": "APROBADA",
        "descripcion": "Aprobada",
        "final": false
      },
      {
        "codigo": "EXPEDIDA",
        "descripcion": "Póliza expedida",
        "final": true
      },
      {
        "codigo": "RECHAZADA",
        "descripcion": "Rechazada",
        "final": true
      },
      {
        "codigo": "ANULADA",
        "descripcion": "Anulada",
        "final": true
      }
    ],
    "estrato": [
      {
        "codigo": "1",
        "descripcion": "Estrato 1"
      },
      {
        "codigo": "2",
        "descripcion": "Estrato 2"
      },
      {
        "codigo": "3",
        "descripcion": "Estrato 3"
      },
      {
        "codigo": "4",
        "descripcion": "Estrato 4"
      },
      {
        "codigo": "5",
        "descripcion": "Estrato 5"
      },
      {
        "codigo": "6",
        "descripcion": "Estrato 6"
      }
    ],
    "faq_ayuda": [
      {
        "codigo": "REQUISITOS",
        "descripcion": "¿Cuáles son los requisitos para comercializar pólizas de arrendamiento?",
        "respuesta": "Debes estar acreditado como broker activo con Seguros Bolívar, completar la formación oficial, tener acceso al portal y estar al día con Conocimiento de Cliente anual. Cada solicitud requiere estudio de aseguramiento."
      },
      {
        "codigo": "DOCUMENTOS",
        "descripcion": "¿Qué documentos necesito para radicar una nueva póliza?",
        "respuesta": "Natural: cédula del propietario y certificado de tradición. Jurídica: certificado de existencia (≤30 días), cédula del RL y formulario Conocimiento de Cliente. Se recomienda contrato firmado."
      },
      {
        "codigo": "COMISIONES",
        "descripcion": "¿Cómo se pagan mis comisiones?",
        "respuesta": "Genera la cuenta de cobro en el portal y cárgala en la plataforma de pagos. El área registra el pago: en Seguimiento ves por póliza si la comisión está pagada, con orden de pago o pendiente."
      },
      {
        "codigo": "TIEMPO_ESTUDIO",
        "descripcion": "¿Cuánto tiempo demora el estudio de una póliza?",
        "respuesta": "Natural sin novedades: 6 horas hábiles. Jurídica o con requerimientos: hasta 24 horas. Consulta estado en Seguimiento."
      },
      {
        "codigo": "RENOVACION",
        "descripcion": "¿Cómo funciona el proceso de renovación?",
        "respuesta": "En Renovaciones elige la póliza y decide: renovar en línea, no renovar (indicando el motivo) o solicitar un caso especial. El estado de cada renovación queda visible en el mismo módulo."
      },
      {
        "codigo": "COTIZAR",
        "descripcion": "¿Puedo cotizar sin tener todos los datos del inmueble?",
        "respuesta": "Sí. El cotizador genera valores estimados con info básica: tipo de inmueble, canon, administración y coberturas. El valor final puede variar tras estudio."
      },
      {
        "codigo": "RECLAMACION",
        "descripcion": "¿Qué hago si el cliente presenta una reclamación?",
        "respuesta": "Consulta el \"Instructivo de reclamación\" en Documentos. Ante dudas, conecta con Victoria (Estudios) o radica en PQRS."
      },
      {
        "codigo": "DESOCUPA",
        "descripcion": "¿Qué pasa si el inquilino desocupa el inmueble antes de tiempo?",
        "respuesta": "El contrato de arrendamiento finaliza con la entrega formal y material del inmueble al arrendador, cumpliendo los requisitos legales y contractuales. El arrendador, luego de verificar si el arrendatario está en mora en el pago del canon, podrá radicar aviso de reclamación a la aseguradora para hacer efectiva la póliza ante el incumplimiento."
      },
      {
        "codigo": "ABANDONO",
        "descripcion": "¿Qué hace el propietario si un inquilino abandona el inmueble y deja las llaves en portería?",
        "respuesta": "Como el contrato sigue vigente, se sugiere no reclamar las llaves ni ingresar al inmueble. Una vez se dé el incumplimiento en el pago del canon, el arrendador podrá radicar aviso de reclamación a la aseguradora informando que el inmueble está desocupado o abandonado."
      },
      {
        "codigo": "RETENCION",
        "descripcion": "¿Se puede retener algo si el inquilino no paga la penalidad por entrega anticipada?",
        "respuesta": "El contrato puede terminarse en cualquier momento por mutuo acuerdo. Ante el incumplimiento en el pago del canon, durante el plazo inicial o la prórroga, el arrendador puede presentar aviso de reclamación. El arrendador no puede hacer ninguna retención: la terminación solo opera hasta que se efectúe la entrega formal del inmueble, cumpliendo las obligaciones legales y contractuales."
      },
      {
        "codigo": "CONDICIONES",
        "descripcion": "¿Qué pasa si el inquilino no entrega el inmueble en las mismas condiciones en que lo recibió?",
        "respuesta": "Con la cobertura de daños y faltantes de inventario, el arrendador puede radicar aviso de reclamación una vez reciba formalmente el inmueble, hasta por el monto asegurado. Sin esa cobertura, puede iniciar las acciones judiciales pertinentes, ya que el arrendatario debe reparar los daños causados, salvo el desgaste natural por el buen uso."
      },
      {
        "codigo": "ANTIGUEDAD",
        "descripcion": "¿Quién asume los daños por antigüedad y no por el uso del inmueble?",
        "respuesta": "Las reparaciones locativas (deterioros producidos por culpa del arrendatario o sus dependientes, art. 1998 del Código Civil) están a cargo del arrendatario. Las reparaciones necesarias para mantener el bien en óptimo estado, incluido el desgaste natural, están a cargo del arrendador, que debe mantener la propiedad en buen estado para su uso."
      },
      {
        "codigo": "SERVICIOS_CORTE",
        "descripcion": "¿Qué pasa si dejan cortar los servicios públicos y el inquilino no quiere pagar?",
        "respuesta": "El no pago de los servicios públicos es causal de incumplimiento del contrato. Con la cobertura de servicios públicos domiciliarios, el arrendador puede radicar aviso de reclamación una vez reciba formalmente el inmueble, respecto de los servicios consumidos y no facturados a la fecha de entrega, hasta por el monto asegurado."
      },
      {
        "codigo": "MULTAS",
        "descripcion": "Si la copropiedad multa al inquilino y sancionan al propietario, ¿opera el seguro?",
        "respuesta": "Las multas de la copropiedad están excluidas de la cobertura de la póliza. El arrendatario debe cumplir el reglamento de propiedad horizontal (Ley 820/2003, art. 9, num. 4). El arrendador debe comunicarle formalmente el hecho con las pruebas de la copropiedad. Se recomienda dejar constancia en el contrato de que el arrendatario recibió copia del reglamento y el manual de convivencia."
      },
      {
        "codigo": "COB_SERVICIOS",
        "descripcion": "¿Qué cubre la cobertura de servicios públicos?",
        "respuesta": "Cubre el consumo de energía eléctrica, acueducto y alcantarillado, aseo y recolección de basuras, gas, y teléfono local y de larga distancia nacional e internacional, hasta el valor máximo asegurado. Ampara el consumo, no la cantidad debida por cada servicio considerado de forma independiente."
      },
      {
        "codigo": "COB_DANOS",
        "descripcion": "¿Qué cubre la cobertura de daños y faltantes?",
        "respuesta": "Ampara los daños físicos ocurridos durante la vigencia del contrato en las instalaciones, dotación y accesorios relacionados en el inventario escrito del contrato, a cargo del arrendatario al momento de la desocupación, hasta el valor máximo asegurado. También cubre los faltantes del inventario de recibo a cargo del arrendatario."
      },
      {
        "codigo": "CLAUSULA_PENAL",
        "descripcion": "¿La póliza cubre la cláusula penal?",
        "respuesta": "No. Según la Cláusula Segunda — Exclusiones (numeral 2.1), la póliza no ampara el pago de sumas generadas por cláusulas penales."
      },
      {
        "codigo": "FALLECIMIENTO",
        "descripcion": "¿Qué pasa si fallece el inquilino o el propietario?",
        "respuesta": "En Colombia la muerte de una de las partes no termina el contrato de forma unilateral. Si fallece el arrendatario, conviene solicitar estudio de arrendamiento y formalizar un nuevo contrato con los ocupantes o pedir la entrega; las obligaciones continúan con los causahabientes, el cónyuge y los deudores solidarios. Si fallece el arrendador, los herederos deben adelantar el trámite sucesoral para trasladar legalmente la propiedad y continuar la administración."
      },
      {
        "codigo": "REINTEGRO",
        "descripcion": "¿Cómo solicito un reintegro cuando el inquilino paga y ya se reportó al seguro?",
        "respuesta": "Escribe al Bot-Eli al celular 3144065758 y sigue los pasos: cédula, teléfono y correo; opción 2 (indica si eres Arrendador o Inmobiliaria); opción 1 (Cartera); opción 4 (enviar link de reintegro); opción 1 (un solo reintegro); número de solicitud (figura en la póliza); nombre y apellido; y valor a reintegrar. El Bot-Eli envía el link de reintegro entre 20 y 30 minutos."
      },
      {
        "codigo": "JURIDICO",
        "descripcion": "¿Con quién puedo hablar sobre una reclamación o un tema jurídico?",
        "respuesta": "Para reclamaciones y temas jurídicos puedes comunicarte a través de Contáctanos de El Libertador (https://www.ellibertador.co/contactanos) o radicar tu caso en el Portal PQRS. El término de ley para los derechos de petición es de 15 días hábiles contados a partir del día siguiente a su recepción."
      }
    ],
    "forma_pago": [
      {
        "codigo": "DEBITO_AUTOMATICO",
        "descripcion": "Débito automático"
      },
      {
        "codigo": "PSE",
        "descripcion": "PSE"
      },
      {
        "codigo": "TARJETA_CREDITO",
        "descripcion": "Tarjeta de crédito"
      },
      {
        "codigo": "EFECTIVO",
        "descripcion": "Efectivo"
      },
      {
        "codigo": "TRANSFERENCIA",
        "descripcion": "Transferencia bancaria"
      }
    ],
    "frecuencia_pago": [
      {
        "codigo": "MENSUAL",
        "descripcion": "Mensual"
      },
      {
        "codigo": "TRIMESTRAL",
        "descripcion": "Trimestral"
      },
      {
        "codigo": "ANUAL",
        "descripcion": "Anual"
      }
    ],
    "modalidad_renovacion": [
      {
        "codigo": "mismosValores",
        "descripcion": "Renovar con los mismos valores"
      },
      {
        "codigo": "conAjustes",
        "descripcion": "Renovar con ajustes (canon, vigencia o coberturas)"
      }
    ],
    "modulo_portal": [
      {
        "codigo": "seguimiento",
        "descripcion": "Seguimiento",
        "icono": "grid_view",
        "prospecto": true
      },
      {
        "codigo": "agente",
        "descripcion": "Agente IA (radicación)",
        "icono": "smart_toy",
        "prospecto": true
      },
      {
        "codigo": "radicacion",
        "descripcion": "Radicación de pólizas",
        "icono": "post_add",
        "prospecto": true
      },
      {
        "codigo": "cotizador",
        "descripcion": "Cotizaciones",
        "icono": "calculate",
        "prospecto": true
      },
      {
        "codigo": "contrato",
        "descripcion": "Contratos",
        "icono": "description",
        "prospecto": true
      },
      {
        "codigo": "documentos",
        "descripcion": "Documentos",
        "icono": "folder_open",
        "prospecto": true
      },
      {
        "codigo": "ayuda",
        "descripcion": "Ayuda",
        "icono": "help_outline",
        "prospecto": true
      },
      {
        "codigo": "renovaciones",
        "descripcion": "Renovaciones",
        "icono": "update",
        "prospecto": false
      },
      {
        "codigo": "referidos",
        "descripcion": "Referir cliente",
        "icono": "person_add",
        "prospecto": false
      },
      {
        "codigo": "estado-referidos",
        "descripcion": "Estado de referidos",
        "icono": "conversion_path",
        "prospecto": false
      },
      {
        "codigo": "nuevo-negocio",
        "descripcion": "Nuevo negocio",
        "icono": "add_business",
        "prospecto": false
      },
      {
        "codigo": "coberturas",
        "descripcion": "Coberturas",
        "icono": "shield",
        "prospecto": false
      },
      {
        "codigo": "calendario",
        "descripcion": "Calendario",
        "icono": "calendar_today",
        "prospecto": false
      },
      {
        "codigo": "comisiones",
        "descripcion": "Dashboard de comisiones",
        "icono": "payments",
        "prospecto": false
      }
    ],
    "motivo_no_renovacion": [
      {
        "codigo": "DESOCUPACION",
        "descripcion": "Desocupación",
        "para_broker": true
      },
      {
        "codigo": "NO_JUSTIFICA_MOTIVO",
        "descripcion": "No justifica motivo",
        "para_broker": true
      },
      {
        "codigo": "VENTA_INMUEBLE",
        "descripcion": "Venta inmueble",
        "para_broker": true
      },
      {
        "codigo": "CAMBIO_ARRENDATARIO",
        "descripcion": "Cambio de arrendatario",
        "para_broker": true
      },
      {
        "codigo": "POLIZA_REVOCADA",
        "descripcion": "Póliza Revocada",
        "para_broker": true
      },
      {
        "codigo": "COMPETENCIA",
        "descripcion": "Competencia",
        "para_broker": true
      },
      {
        "codigo": "CAMBIO_INMOBILIARIA",
        "descripcion": "Cambiò a inmobiliaria",
        "para_broker": true
      },
      {
        "codigo": "PROPIETARIO_FALLECIDO",
        "descripcion": "Propietario fallecido",
        "para_broker": true
      },
      {
        "codigo": "INGRESOS_INSUFICIENTES",
        "descripcion": "Ingresos insuficientes",
        "para_broker": true
      },
      {
        "codigo": "PROPIETARIO_RESIDE",
        "descripcion": "Propietario ahora reside en el inmueble",
        "para_broker": true
      },
      {
        "codigo": "MAL_SERVICIO",
        "descripcion": "Mal servicio",
        "para_broker": true
      },
      {
        "codigo": "NEGADO_GERENCIA",
        "descripcion": "Negado (Gerencia técnica)",
        "para_broker": false
      },
      {
        "codigo": "BROKER_DESVINCULADO",
        "descripcion": "Broker desvinculado, se pasa cliente a Neg. Especiales",
        "para_broker": false
      }
    ],
    "perfil_asesor": [
      {
        "codigo": "DOCUMENTAL",
        "descripcion": "Documental"
      },
      {
        "codigo": "RENOVACIONES",
        "descripcion": "Renovaciones"
      },
      {
        "codigo": "CONTACT_CENTER",
        "descripcion": "Contact Center"
      }
    ],
    "plantilla_contrato": [
      {
        "codigo": "VIVIENDA",
        "descripcion": "Contrato de arrendamiento de vivienda urbana",
        "objeto": "Documentos Brokers/Contrato de Vivienda2025 (1).docx"
      },
      {
        "codigo": "COMERCIO",
        "descripcion": "Contrato de arrendamiento comercial (Código de Comercio)",
        "objeto": "Documentos Brokers/Contrato de Comercio2025.docx"
      }
    ],
    "producto": [
      {
        "codigo": "ARRENDAMIENTO_VIVIENDA",
        "descripcion": "Arrendamiento Residencial"
      },
      {
        "codigo": "ARRENDAMIENTO_COMERCIO",
        "descripcion": "Arrendamiento Comercial"
      }
    ],
    "quien_firma": [
      {
        "codigo": "PROPIETARIO",
        "descripcion": "Propietario"
      },
      {
        "codigo": "APODERADO",
        "descripcion": "Apoderado"
      }
    ],
    "ramo_no_cotizable": [
      {
        "codigo": "AUTOS",
        "descripcion": "Seguro de Carros"
      },
      {
        "codigo": "VIDA",
        "descripcion": "Seguro de Vida"
      },
      {
        "codigo": "DESEMPLEO",
        "descripcion": "Seguro de Desempleo"
      },
      {
        "codigo": "HOGAR",
        "descripcion": "Seguro de Hogar"
      }
    ],
    "rol": [
      {
        "codigo": "ADMINISTRADOR",
        "descripcion": "Administrador — gestión completa del portal"
      },
      {
        "codigo": "COMERCIAL",
        "descripcion": "Comercial — seguimiento de los brokers de su cartera"
      },
      {
        "codigo": "ANALISTA_DOCUMENTAL",
        "descripcion": "Analista documental — revisión de documentos de legalización"
      },
      {
        "codigo": "BROKER",
        "descripcion": "Broker — opera su propia cartera de trámites"
      }
    ],
    "sarlaft_resultado": [
      {
        "codigo": "actualizado",
        "descripcion": "Actualizado"
      },
      {
        "codigo": "desactualizado",
        "descripcion": "Pendiente de actualizar"
      },
      {
        "codigo": "consultable",
        "descripcion": "Consultable"
      },
      {
        "codigo": "rechazado",
        "descripcion": "Rechazado"
      }
    ],
    "texto_portal": [
      {
        "codigo": "NOTA_TASAS_COTIZADOR",
        "descripcion": "Nota: Pólizas que superen $9.000.000 de valor asegurado (canon + admon) mensual tienen una tasa de 3.0%. Las inferiores tienen una tasa de 3.5%. El IVA es del 19%."
      }
    ],
    "tipo_caso_especial": [
      {
        "codigo": "OTRO_SI",
        "descripcion": "Otro Sí",
        "para_broker": true
      },
      {
        "codigo": "CESION",
        "descripcion": "Cesión de contrato",
        "para_broker": true
      },
      {
        "codigo": "CORRECCION",
        "descripcion": "Corrección de póliza",
        "para_broker": false
      }
    ],
    "tipo_cuenta": [
      {
        "codigo": "AHORROS",
        "descripcion": "Ahorros"
      },
      {
        "codigo": "CORRIENTE",
        "descripcion": "Corriente"
      }
    ],
    "tipo_documento": [
      {
        "codigo": "CC",
        "descripcion": "Cédula de ciudadanía",
        "registro_broker": true,
        "apoderado": true,
        "propietario": true
      },
      {
        "codigo": "CE",
        "descripcion": "Cédula de extranjería",
        "registro_broker": true,
        "apoderado": true,
        "propietario": true
      },
      {
        "codigo": "NIT",
        "descripcion": "NIT",
        "registro_broker": true,
        "apoderado": false,
        "propietario": true
      },
      {
        "codigo": "PA",
        "descripcion": "Pasaporte",
        "registro_broker": false,
        "apoderado": true,
        "propietario": true
      },
      {
        "codigo": "TI",
        "descripcion": "Tarjeta de identidad",
        "registro_broker": false,
        "apoderado": false,
        "propietario": false
      }
    ],
    "tipo_documento_archivo": [
      {
        "codigo": "CEDULA",
        "descripcion": "Cédula"
      },
      {
        "codigo": "CONTRATO",
        "descripcion": "Contrato"
      },
      {
        "codigo": "SARLAFT",
        "descripcion": "SARLAFT"
      },
      {
        "codigo": "CTL",
        "descripcion": "CTL"
      },
      {
        "codigo": "CEDULA_CORRECCION",
        "descripcion": "Cédula (corrección)"
      },
      {
        "codigo": "CONTRATO_CORRECCION",
        "descripcion": "Contrato (corrección)"
      },
      {
        "codigo": "SARLAFT_CORRECCION",
        "descripcion": "SARLAFT (corrección)"
      },
      {
        "codigo": "CTL_CORRECCION",
        "descripcion": "CTL (corrección)"
      },
      {
        "codigo": "OTRO",
        "descripcion": "Otro documento"
      }
    ],
    "tipo_firma": [
      {
        "codigo": "DIGITAL",
        "descripcion": "Firma digital"
      },
      {
        "codigo": "ELECTRONICA",
        "descripcion": "Firma electrónica"
      },
      {
        "codigo": "FISICA",
        "descripcion": "Firma física (manuscrita)"
      }
    ],
    "tipo_inmueble": [
      {
        "codigo": "APARTAMENTO",
        "descripcion": "Apartamento"
      },
      {
        "codigo": "CASA",
        "descripcion": "Casa"
      },
      {
        "codigo": "VIVIENDA_RURAL",
        "descripcion": "Vivienda rural"
      },
      {
        "codigo": "LOCAL_COMERCIAL",
        "descripcion": "Local comercial"
      },
      {
        "codigo": "OFICINA",
        "descripcion": "Oficina"
      },
      {
        "codigo": "BODEGA",
        "descripcion": "Bodega"
      }
    ],
    "tipo_persona": [
      {
        "codigo": "NATURAL",
        "descripcion": "Natural"
      },
      {
        "codigo": "JURIDICA",
        "descripcion": "Jurídica"
      }
    ],
    "tipo_pqr": [
      {
        "codigo": "PETICION",
        "descripcion": "Petición"
      },
      {
        "codigo": "QUEJA",
        "descripcion": "Queja"
      },
      {
        "codigo": "RECLAMO",
        "descripcion": "Reclamo"
      },
      {
        "codigo": "SUGERENCIA",
        "descripcion": "Sugerencia"
      }
    ],
    "tipo_radicador": [
      {
        "codigo": "BROKERS",
        "descripcion": "Brokers"
      },
      {
        "codigo": "INMOBILIARIA",
        "descripcion": "Inmobiliaria"
      }
    ],
    "uso_inmueble": [
      {
        "codigo": "RESIDENCIAL",
        "descripcion": "Habitacional",
        "plantilla": "VIVIENDA"
      },
      {
        "codigo": "COMERCIAL",
        "descripcion": "Comercial",
        "plantilla": "COMERCIO"
      },
      {
        "codigo": "MIXTO",
        "descripcion": "Mixto",
        "plantilla": "COMERCIO"
      }
    ],
    "vigencia_poliza": [
      {
        "codigo": "ANUAL",
        "descripcion": "Anual (12 meses)"
      },
      {
        "codigo": "SEMESTRAL",
        "descripcion": "Semestral (6 meses)"
      },
      {
        "codigo": "TRIMESTRAL",
        "descripcion": "Trimestral (3 meses)"
      },
      {
        "codigo": "MENSUAL",
        "descripcion": "Mensual (1 mes)"
      }
    ]
  },
  "parametros": {
    "ANIO_IPC": 2026.0,
    "COMISION_ESTIMADA": 0.08,
    "COMISION_PLAZO_COBRO_MESES": 3.0,
    "COMISION_PORCENTAJE_DEFECTO": 20.0,
    "CUENTA_COBRO_MAX_FILAS": 20.0,
    "CUENTA_COBRO_VALOR_MAX": 500000000.0,
    "CUENTA_COBRO_VALOR_MIN": 50000.0,
    "FACTOR_IVA": 1.19,
    "IPC_RENOVACION": 5.1,
    "IVA_CANON_COMERCIO": 0.19,
    "MONTO_MAX_COBERTURA": 10000000.0,
    "PASO_MONTO_COBERTURA": 500000.0,
    "POLIZA_LARGO": 13.0,
    "POLIZA_PREFIJO": 5010.0,
    "RENOV_IVA_PRIMA": 0.19,
    "RENOV_MIN_DYF": 1000000.0,
    "RENOV_OBSEQUIO_SERV_COMERCIO": 2000000.0,
    "RENOV_OBSEQUIO_SERV_VIVIENDA": 1000000.0,
    "RENOV_TASA_CANON": 0.035,
    "RENOV_TASA_DYF": 0.05,
    "RENOV_TASA_SERVICIOS": 0.05,
    "RENOV_TOPE_IPC": 5.2,
    "RENOV_VIGENCIA_MIN_MESES": 6.0,
    "SARLAFT_ADVERTENCIA_ANIOS": 2.5,
    "SARLAFT_VIGENCIA_ANIOS": 3.0,
    "VIGENCIA_DEFECTO_MESES": 12.0,
    "VIGENCIA_MAX_MESES": 12.0,
    "VIGENCIA_MIN_MESES": 6.0
  },
  "seguimiento": [
    {
      "codigo": "radicada",
      "descripcion": "Radicada · por enviar al área"
    },
    {
      "codigo": "en_revision",
      "descripcion": "En revisión del área"
    },
    {
      "codigo": "aprobada",
      "descripcion": "Póliza expedida"
    },
    {
      "codigo": "bloqueada",
      "descripcion": "Desistida o anulada"
    },
    {
      "codigo": "observada",
      "descripcion": "Corrección pendiente"
    }
  ],
  "radicacionWarehouse": [
    {
      "descripcion": "En revisión de documentos",
      "requiereAccion": false,
      "valorWarehouse": "Pendiente Validación Documental",
      "codigo": "EN_GESTION"
    },
    {
      "descripcion": "Corrección pendiente",
      "requiereAccion": true,
      "valorWarehouse": "Pendiente Corrección Documental",
      "codigo": "EN_CORRECCION"
    },
    {
      "descripcion": "Póliza expedida",
      "requiereAccion": false,
      "valorWarehouse": "Expedido",
      "codigo": "EXPEDIDA"
    },
    {
      "descripcion": "Desistida",
      "requiereAccion": false,
      "valorWarehouse": "Desistido",
      "codigo": "ANULADA"
    }
  ],
  "renovacionWarehouse": [
    {
      "estadoSnapshot": "pendiente",
      "descripcion": "Por renovar",
      "requiereAccion": true,
      "codigo": "POR_RENOVAR"
    },
    {
      "estadoSnapshot": "en_gestion",
      "descripcion": "En contacto",
      "requiereAccion": true,
      "codigo": "EN_CONTACTO"
    },
    {
      "estadoSnapshot": "en_gestion",
      "descripcion": "En expedición",
      "requiereAccion": false,
      "codigo": "EN_EXPEDICION"
    },
    {
      "estadoSnapshot": "en_gestion",
      "descripcion": "Corrección pendiente",
      "requiereAccion": true,
      "codigo": "CORRECCION"
    },
    {
      "estadoSnapshot": "renovada",
      "descripcion": "Renovada",
      "requiereAccion": false,
      "codigo": "RENOVADA"
    },
    {
      "estadoSnapshot": "no_renovada",
      "descripcion": "No renovada",
      "requiereAccion": false,
      "codigo": "NO_RENOVADA"
    },
    {
      "estadoSnapshot": "caso_especial",
      "descripcion": "Caso especial",
      "requiereAccion": false,
      "codigo": "CASO_ESPECIAL"
    },
    {
      "estadoSnapshot": "en_gestion",
      "descripcion": "En gestión",
      "requiereAccion": false,
      "codigo": "EN_GESTION"
    }
  ]
} as unknown as Catalogos;

/**
 * Proveedor de `CatalogoService` ya cargado con `CATALOGOS_PRUEBA`. Usa su propio inyector para no pisar el
 * `HttpClient` (real o de testing) que configure cada spec.
 */
export function proveerCatalogosPrueba(): Provider {
  return {
    provide: CatalogoService,
    useFactory: () => {
      const servicio = Injector.create({
        providers: [{ provide: HttpClient, useValue: {} }, { provide: CatalogoService }],
      }).get(CatalogoService);
      servicio.usar(CATALOGOS_PRUEBA);
      return servicio;
    },
  };
}
