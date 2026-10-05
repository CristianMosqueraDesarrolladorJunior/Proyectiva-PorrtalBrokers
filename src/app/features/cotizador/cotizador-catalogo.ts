/**
 * Catálogos de presentación del Cotizador (Req 7.1, 7.4).
 *
 * Ubicación: junto al feature `cotizador`. Contiene únicamente datos de
 * presentación (opciones de departamento y tipos de inmueble) para poblar los
 * selectores del formulario de entrada. Las ciudades cubiertas NO se listan aquí:
 * se obtienen del API_Backend por departamento (`CotizadorService.ciudadesPorDepartamento`,
 * Req 7.2, 7.3) y se filtran con la lógica pura de `cobertura-ciudades.ts`.
 *
 * Sin dependencias de Angular. El cálculo y la cobertura autoritativos residen en
 * el backend (Req 8.7); estos valores solo alimentan la UX.
 */

/** Tipo de inmueble "Comercio", único que habilita asegurar el IVA del canon (Req 7.4). */
export const TIPO_INMUEBLE_COMERCIO = 'Comercio';

/**
 * Tipos de inmueble ofrecidos en el selector del Cotizador (Req 7.1, 7.4).
 * "Comercio" habilita el aseguramiento del IVA (19% del canon).
 */
export const TIPOS_INMUEBLE: readonly string[] = ['Vivienda', TIPO_INMUEBLE_COMERCIO, 'Oficina', 'Bodega', 'Local'];

/**
 * Departamentos ofrecidos en el selector del Cotizador (Req 7.1, 7.2).
 * Las ciudades disponibles por departamento las resuelve el backend en tiempo
 * real (Req 7.2); si el departamento no tiene ciudades en cobertura, el Cotizador
 * lo indica e impide el cálculo (Req 7.3).
 */
export const DEPARTAMENTOS: readonly string[] = [
  'Cundinamarca',
  'Valle del Cauca',
  'Meta',
  'Antioquia',
  'Atlántico',
];

/**
 * Ciudades con cobertura por departamento (fiel al prototipo `updateCotCities`).
 * Fallback local para poblar el selector de ciudad de inmediato mientras el
 * backend responde; el backend sigue siendo la fuente autoritativa (Req 7.2).
 */
export const CIUDADES_POR_DEPARTAMENTO: Readonly<Record<string, readonly string[]>> = {
  Cundinamarca: ['Bogotá', 'Chía', 'Zipaquirá', 'Soacha', 'Facatativá'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá'],
  Meta: ['Villavicencio', 'Acacías', 'Granada'],
  Antioquia: ['Medellín', 'Envigado', 'Bello', 'Itagüí'],
  Atlántico: ['Barranquilla', 'Soledad', 'Malambo'],
};

/** Meses de vigencia mínimo permitido de la Cotizacion (Req 7.1). */
export const MESES_VIGENCIA_MIN = 1;

/** Meses de vigencia máximo permitido de la Cotizacion (Req 7.1). */
export const MESES_VIGENCIA_MAX = 36;

/** Porcentaje de IVA aplicable al canon cuando el inmueble es Comercio (Req 7.4). */
export const IVA_CANON_COMERCIO = 0.19;

/** Monto máximo seleccionable por cobertura adicional (prototipo: $10.000.000). */
export const MONTO_MAXIMO_COBERTURA = 10_000_000;

/** Porcentaje de comisión estimada sobre la prima neta del seguro principal (prototipo). */
export const COMISION_ESTIMADA = 0.08;

/** Nota de tasas mostrada bajo el desglose de la cotización (prototipo). */
export const NOTA_TASAS =
  'Nota: Pólizas que superen $9.000.000 de valor asegurado (canon + admon) mensual tienen una tasa de 3.0%. Las inferiores tienen una tasa de 3.5%. El IVA es del 19%.';

/** Detalle informativo de cada cobertura adicional ("Consultar detalle"). */
export interface DetalleCobertura {
  readonly parrafos: readonly string[];
  readonly destacado: string;
}

export const DETALLE_COBERTURAS: Readonly<Record<string, DetalleCobertura>> = {
  danios: {
    parrafos: [
      'Protegemos tu inmueble si, al ser entregado, faltan elementos del inventario.',
      'Reporta la situación dentro de los 90 días siguientes a la salida del inquilino, junto con el inventario firmado y las fotos.',
      'Nosotros cubrimos el costo de reparación.',
    ],
    destacado: 'Te recomendamos tener tu inventario al día.',
  },
  servicios: {
    parrafos: [
      'Si el inquilino entrega el inmueble y deja facturas pendientes de agua, luz y gas, asumimos el pago hasta por $1.000.000.',
      'Solo necesitas avisarnos durante los tres primeros meses tras la entrega del inmueble, adjuntar las facturas originales con la deuda y la constancia de salida.',
    ],
    destacado:
      'Con estos documentos nos encargamos de realizar el reembolso correspondiente (no cubrimos reconexiones).',
  },
};

/** Vigencia por defecto (prototipo: 12 meses). */
export const MESES_VIGENCIA_DEFECTO = 12;
