import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { ValidacionCtl } from '../../../../core/models/contrato.model';
import { ContratoService } from '../../../../core/services/contrato.service';
import { CtlValidacionComponent } from './ctl-validacion.component';

const BASE: ValidacionCtl = {
  vigente: true,
  antiguedadDias: 30,
  fechaImpresion: '2026-09-20',
  motivo: 'vigente',
  departamento: 'Cundinamarca',
  municipio: 'Bogotá D.C.',
  direccion: 'CL 81B 80 05',
  matricula: '50C-998877',
  direccionCoincide: true,
  departamentoBloqueado: false,
};

const pdf = (tamano = 1000, tipo = 'application/pdf', nombre = 'ctl.pdf') =>
  new File([new Uint8Array(tamano)], nombre, { type: tipo });

function crear(validarCtl: jest.Mock) {
  TestBed.configureTestingModule({
    imports: [CtlValidacionComponent],
    providers: [{ provide: ContratoService, useValue: { validarCtl } }],
  });
  const fixture = TestBed.createComponent(CtlValidacionComponent);
  fixture.componentRef.setInput('direccionContrato', 'CL 81B 80 05');
  fixture.detectChanges();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { fixture, cmp: fixture.componentInstance as any, el: fixture.nativeElement as HTMLElement };
}

describe('CtlValidacionComponent', () => {
  it('Given un CTL vigente con la dirección del contrato, When se valida, Then muestra "vigente" y ninguna alerta de dirección', () => {
    const validarCtl = jest.fn().mockReturnValue(of(BASE));
    const { fixture, cmp, el } = crear(validarCtl);
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf() });
    fixture.detectChanges();

    expect(validarCtl).toHaveBeenCalledWith(expect.any(File), 'CL 81B 80 05');
    expect(el.textContent).toContain('Certificado vigente');
    expect(el.textContent).not.toContain('La dirección no coincide');
  });

  it('Given un CTL de más de 90 días, When se valida, Then indica que está vencido con texto (no solo color)', () => {
    const { fixture, cmp, el } = crear(
      jest.fn().mockReturnValue(of({ ...BASE, vigente: false, antiguedadDias: 120, motivo: 'supera_antiguedad' })),
    );
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf() });
    fixture.detectChanges();

    expect(el.textContent).toContain('Certificado vencido');
    expect(el.textContent).toContain('120 días');
  });

  it('Given una dirección distinta, When se valida, Then muestra la alerta de discrepancia', () => {
    const { fixture, cmp, el } = crear(jest.fn().mockReturnValue(of({ ...BASE, direccionCoincide: false })));
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf() });
    fixture.detectChanges();

    expect(el.textContent).toContain('La dirección no coincide con el contrato');
  });

  it('Given sin fecha de impresión, When se valida, Then avisa que no fue posible validar la antigüedad', () => {
    const { fixture, cmp, el } = crear(
      jest.fn().mockReturnValue(of({ ...BASE, vigente: false, antiguedadDias: null, motivo: 'fecha_no_determinada' })),
    );
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf() });
    fixture.detectChanges();

    expect(el.textContent).toContain('No pudimos validar la antigüedad');
  });

  it('Given un CTL de Antioquia, When se valida, Then avisa que el departamento no está habilitado', () => {
    const { fixture, cmp, el } = crear(
      jest.fn().mockReturnValue(of({ ...BASE, departamento: 'Antioquia', departamentoBloqueado: true })),
    );
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf() });
    fixture.detectChanges();

    expect(el.textContent).toContain('Departamento no habilitado');
  });

  it('Given un archivo que no es PDF o pesa más de 10 MB, When se elige, Then se rechaza sin llamar al servidor', () => {
    const validarCtl = jest.fn();
    const { fixture, cmp, el } = crear(validarCtl);
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf(1000, 'image/png', 'ctl.png') });
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf(11 * 1024 * 1024) });
    fixture.detectChanges();

    expect(validarCtl).not.toHaveBeenCalled();
    expect(el.textContent).toContain('PDF de máximo 10 MB');
  });

  it('Given que el servicio de lectura no responde, When se valida, Then adjunta el certificado y avisa sin bloquear', () => {
    const { fixture, cmp, el } = crear(jest.fn().mockReturnValue(throwError(() => ({ status: 503 }))));
    const adjuntos: File[] = [];
    cmp.archivo.subscribe((f: File) => adjuntos.push(f));
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf() });
    fixture.detectChanges();

    expect(adjuntos).toHaveLength(1);
    expect(el.textContent).toContain('Certificado adjunto sin validar');
    expect(el.querySelector('app-doc-uploader')).not.toBeNull();
  });

  it('Given un archivo que no es un certificado legible, When se valida, Then lo rechaza y no lo adjunta', () => {
    const { fixture, cmp, el } = crear(jest.fn().mockReturnValue(throwError(() => ({ status: 422 }))));
    const adjuntos: File[] = [];
    cmp.archivo.subscribe((f: File) => adjuntos.push(f));
    cmp.validar({ id: 'certificadoTradicion', archivo: pdf() });
    fixture.detectChanges();

    expect(adjuntos).toHaveLength(0);
    expect(el.textContent).toContain('Revisa el certificado');
  });
});
