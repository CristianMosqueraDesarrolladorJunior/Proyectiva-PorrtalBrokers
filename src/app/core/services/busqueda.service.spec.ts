import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { BusquedaService, type ResultadoBusqueda } from './busqueda.service';
import { SessionService } from './session.service';

describe('BusquedaService.destino', () => {
  const rol = signal<string>('BROKER');
  const r = (tipo: ResultadoBusqueda['tipo'], radicado: string | null = null): ResultadoBusqueda => ({
    tipo,
    referencia: tipo === 'CONTRATO' ? 'CTR-ABC' : 'COT-XYZ',
    titulo: '',
    detalle: null,
    radicado,
  });
  let servicio: BusquedaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: SessionService, useValue: { perfil: () => ({ rol: rol() }) } }],
    });
    servicio = TestBed.inject(BusquedaService);
  });

  it('Given un contrato o una cotización sin radicar, Then el broker lo abre en Documentos con su referencia', () => {
    rol.set('BROKER');
    expect(servicio.destino(r('CONTRATO'))).toEqual({ ruta: '/app/documentos', q: 'CTR-ABC' });
    expect(servicio.destino(r('COTIZACION'))).toEqual({ ruta: '/app/documentos', q: 'COT-XYZ' });
  });

  it('Given un contrato ya radicado, Then también se abre en Documentos con su referencia', () => {
    rol.set('BROKER');
    expect(servicio.destino(r('CONTRATO', 'RAD-1'))).toEqual({ ruta: '/app/documentos', q: 'CTR-ABC' });
  });

  it('Given la consola, Then contratos y cotizaciones van a Documentos, radicados o no', () => {
    rol.set('COMERCIAL');
    expect(servicio.destino(r('CONTRATO'))).toEqual({ ruta: '/admin/documentos', q: 'CTR-ABC' });
    expect(servicio.destino(r('COTIZACION', 'RAD-2'))).toEqual({ ruta: '/admin/documentos', q: 'COT-XYZ' });
  });
});
