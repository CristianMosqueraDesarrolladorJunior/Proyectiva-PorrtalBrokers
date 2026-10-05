// Genera mock-data/admin-cartera.json (servido como /mock/ solo en desarrollo) a partir del CSV del Warehouse
// ("Warehouse Brokers-Inmobiliarias - Consolidado (1).csv").
//
// Uso:  node scripts/generar-mock-admin.mjs [ruta-al-csv]
//
// Solo copia datos de la operación (broker, comercial, estado, valores). Los
// datos del cliente/inquilino (nombre, cédula, correo, celular, cuentas
// bancarias, URLs de Drive, observaciones) NO se incluyen.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath =
  process.argv[2] ??
  resolve(raiz, '..', '..', 'Warehouse Brokers-Inmobiliarias - Consolidado (1).csv');
const salida = resolve(raiz, 'mock-data', 'admin-cartera.json');

/** Parser CSV RFC 4180 (comillas, comas y saltos de línea dentro de campos). */
function parsearCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

/** "31/1/2025 18:49:05" → "2025-01-31T18:49:05"; "" → "". */
function fechaIso(txt) {
  const m = (txt ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return '';
  const p = (n) => String(n ?? 0).padStart(2, '0');
  return `${m[3]}-${p(m[2])}-${p(m[1])}T${p(m[4])}:${p(m[5])}:${p(m[6])}`;
}

/** "$3.300.000" → 3300000. */
function monto(txt) {
  const n = parseInt((txt ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function slug(txt) {
  return txt.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function titulo(txt) {
  return txt.trim().toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
}

const texto = readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const [cabecera, ...filas] = parsearCsv(texto).filter((f) => f.length > 1);
const col = (nombre) => {
  const i = cabecera.findIndex((h) => h.trim() === nombre);
  if (i < 0) throw new Error(`Columna no encontrada: ${nombre}`);
  return i;
};
const C = {
  fecha: col('Fecha_Radicación'),
  tipo: col('Tipo Radicador'),
  codigo: col('Código Solicitud'),
  idRad: col('Id Radicador'),
  nombreRad: col('Nombre Radicador'),
  comercial: col('Comercial_Asignado'),
  celular: col('Celular Broker'),
  ciudad: col('Ciudad Inmueble'),
  destino: col('Destino Inmueble'),
  valorPoliza: col('Valor Total Póliza'),
  valorAsegurar: col('Valor Total Asegurar'),
  estado: col('Estado Solicitud'),
  poliza: col('Numero_Poliza'),
  asesor: col('Asesor Asignado'),
  ultimaGestion: col('Ultima Fecha Gestión'),
  correo: col('Correo Broker-Inmo'),
  horas: col('Horas Gestion'),
};

const comerciales = new Map();
const brokers = new Map();
const negocios = [];

for (const f of filas) {
  const idBroker = (f[C.idRad] ?? '').trim();
  const nombreComercial = (f[C.comercial] ?? '').trim();
  if (!idBroker || !nombreComercial) continue;
  const comercialId = slug(nombreComercial);
  if (!comerciales.has(comercialId)) {
    comerciales.set(comercialId, { id: comercialId, nombre: titulo(nombreComercial) });
  }
  const fecha = fechaIso(f[C.fecha]);
  const previo = brokers.get(idBroker);
  // El comercial vigente del broker es el de su radicación más reciente.
  if (!previo || fecha >= previo._fecha) {
    brokers.set(idBroker, {
      id: idBroker,
      nombre: (f[C.nombreRad] ?? '').trim().replace(/\s+/g, ' '),
      tipo: /inmob/i.test(f[C.tipo]) ? 'Inmobiliaria' : 'Broker',
      celular: (f[C.celular] ?? '').trim(),
      correo: (f[C.correo] ?? '').trim().toLowerCase(),
      comercialId,
      _fecha: fecha,
    });
  }
  negocios.push({
    codigo: (f[C.codigo] ?? '').trim(),
    fecha,
    brokerId: idBroker,
    estado: (f[C.estado] ?? '').trim() || 'Sin estado',
    valorAsegurado: monto(f[C.valorAsegurar]),
    valorPoliza: monto(f[C.valorPoliza]),
    ciudad: (f[C.ciudad] ?? '').trim(),
    destino: (f[C.destino] ?? '').trim(),
    poliza: (f[C.poliza] ?? '').trim(),
    asesor: (f[C.asesor] ?? '').trim().toLowerCase(),
    ultimaGestion: fechaIso(f[C.ultimaGestion]),
    horasGestion: parseInt(f[C.horas], 10) || 0,
  });
}

const datos = {
  generado: new Date().toISOString(),
  fuente: 'Warehouse Brokers-Inmobiliarias - Consolidado',
  comerciales: [...comerciales.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  brokers: [...brokers.values()].map(({ _fecha, ...b }) => b),
  negocios,
};

mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, JSON.stringify(datos));

const porComercial = {};
for (const b of datos.brokers) porComercial[b.comercialId] = (porComercial[b.comercialId] ?? 0) + 1;
console.log(`comerciales=${datos.comerciales.length} brokers=${datos.brokers.length} negocios=${datos.negocios.length}`);
console.log('brokers por comercial (vigente):', porComercial);
console.log('salida:', salida);
