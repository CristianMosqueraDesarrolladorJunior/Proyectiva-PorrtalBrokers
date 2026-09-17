import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnaTabla, DataTableComponent, FilaTabla } from './data-table.component';

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableComponent>;
  let component: DataTableComponent;

  const columnas: ColumnaTabla[] = [
    { key: 'ref', header: 'Ref' },
    { key: 'cliente', header: 'Cliente' },
  ];
  const filas: FilaTabla[] = [
    { ref: 'A-1', cliente: 'Juan' },
    { ref: 'A-2', cliente: 'Ana' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(DataTableComponent);
    component = fixture.componentInstance;
    component.columnas = columnas;
    component.filas = filas;
    component.total = 25;
    component.tamanoPagina = 10;
    component.paginaActual = 1;
    fixture.detectChanges();
  });

  it('renderiza encabezados y filas', () => {
    const headers = fixture.nativeElement.querySelectorAll('th');
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(headers.length).toBe(2);
    expect(rows.length).toBe(2);
  });

  it('emite el índice de la fila al seleccionarla', () => {
    // Given
    const emitido: number[] = [];
    component.seleccionFila.subscribe((indice) => emitido.push(indice));
    // When
    const primeraFila = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    primeraFila.click();
    // Then
    expect(emitido).toEqual([0]);
  });

  it('emite el cambio de página al elegir otra página válida', () => {
    // Given
    const emitido: number[] = [];
    component.cambioPagina.subscribe((pagina) => emitido.push(pagina));
    // When
    const botones = fixture.nativeElement.querySelectorAll('.pg');
    (botones[2] as HTMLButtonElement).click(); // "‹", "1", "2", ...
    // Then
    expect(emitido).toEqual([2]);
  });

  it('no emite cambio de página cuando es la página actual', () => {
    // Given
    const emitido: number[] = [];
    component.cambioPagina.subscribe((pagina) => emitido.push(pagina));
    // When
    (component as unknown as { irAPagina(p: number): void }).irAPagina(1);
    // Then
    expect(emitido).toEqual([]);
  });
});
