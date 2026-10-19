import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { LecturaContratoResponse } from '../../../../core/models/contrato.model';
import { ContratoService } from '../../../../core/services/contrato.service';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';
import { LectorContratoComponent } from './lector-contrato.component';

const LECTURA: LecturaContratoResponse = {
  arrendador: { nombres: 'Ana', apellidos: 'Ruiz' },
  arrendatario: { nombres: 'Luis' },
  inmueble: { ciudad: 'Bogotá' },
  condiciones: { canonMensual: 1_500_000 },
  falta: ['Teléfono del arrendatario'],
};

function crear(leer: jest.Mock) {
  TestBed.configureTestingModule({
    imports: [LectorContratoComponent],
    providers: [{ provide: ContratoService, useValue: { leer } }],
  });
  const fixture = TestBed.createComponent(LectorContratoComponent);
  fixture.detectChanges();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { fixture, cmp: fixture.componentInstance as any };
}

const archivo = (tipo: string, tamano = 1000) =>
  new File([new Uint8Array(tamano)], 'contrato', { type: tipo });

describe('LectorContratoComponent', () => {
  it('rechaza tipos no permitidos sin llamar al backend', () => {
    const leer = jest.fn();
    const { cmp } = crear(leer);
    cmp.leer({ id: 'contrato', archivo: archivo('application/msword') });
    expect(leer).not.toHaveBeenCalled();
    expect(TestBed.inject(FeedbackService).toasts().at(-1)?.mensaje).toContain('PDF');
  });

  it('rechaza archivos de más de 10 MB', () => {
    const leer = jest.fn();
    const { cmp } = crear(leer);
    cmp.leer({ id: 'contrato', archivo: archivo('application/pdf', 10 * 1024 * 1024 + 1) });
    expect(leer).not.toHaveBeenCalled();
    expect(TestBed.inject(FeedbackService).toasts().at(-1)?.mensaje).toContain('10 MB');
  });

  it('emite la lectura y cuenta los datos encontrados', () => {
    const leer = jest.fn().mockReturnValue(of(LECTURA));
    const { fixture, cmp } = crear(leer);
    const emitidos: LecturaContratoResponse[] = [];
    cmp.leido.subscribe((l: LecturaContratoResponse) => emitidos.push(l));
    cmp.leer({ id: 'contrato', archivo: archivo('application/pdf') });
    fixture.detectChanges();
    expect(emitidos).toEqual([LECTURA]);
    expect(cmp.encontrados()).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Teléfono del arrendatario');
  });

  it('muestra el error del backend y conserva el archivo', () => {
    const leer = jest.fn().mockReturnValue(throwError(() => ({ status: 503 })));
    const { cmp } = crear(leer);
    const archivos: File[] = [];
    cmp.archivo.subscribe((a: File) => archivos.push(a));
    cmp.leer({ id: 'contrato', archivo: archivo('image/png') });
    expect(cmp.leyendo()).toBe(false);
    expect(TestBed.inject(FeedbackService).toasts().at(-1)?.mensaje).toContain('a mano');
    // El archivo queda elegido: quien lo aloja puede adjuntarlo aunque la lectura falle.
    expect(archivos).toHaveLength(1);
    expect(cmp.cargados()).toEqual({ contrato: 'contrato' });
  });
});
