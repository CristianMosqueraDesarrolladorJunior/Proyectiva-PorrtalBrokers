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

  it('con muchas páginas muestra primera, última y vecinas de la actual con saltos', () => {
    const paginas = () => (component as unknown as { paginas: number[] }).paginas;
    component.total = 2260;
    component.tamanoPagina = 10;
    component.paginaActual = 50;
    expect(paginas()).toEqual([1, 0, 48, 49, 50, 51, 52, 0, 226]);
    component.paginaActual = 1;
    expect(paginas()).toEqual([1, 2, 3, 0, 226]);
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

  it('pinta la celda principal con subtítulo y emite la acción elegida sin seleccionar la fila', () => {
    component.columnas = [
      { key: 'nombre', header: 'Nombre', tipo: 'principal' },
      {
        key: 'acciones',
        header: '',
        tipo: 'acciones',
        acciones: [
          { id: 'editar', etiqueta: 'Editar', icono: 'edit' },
          { id: 'borrar', etiqueta: 'Borrar', icono: 'delete', tono: 'peligro' },
        ],
      },
    ];
    component.filas = [{ nombre: 'Ana', nombreSub: 'ana@correo.co' }];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dt-principal__sub')?.textContent).toContain('ana@correo.co');
    const acciones: { accion?: string }[] = [];
    const seleccion: number[] = [];
    component.accion.subscribe((a) => acciones.push(a));
    component.seleccionFila.subscribe((i) => seleccion.push(i));
    const botones = el.querySelectorAll<HTMLButtonElement>('.dt-accion');
    expect(botones[1].classList).toContain('dt-accion--peligro');
    botones[1].click();
    expect(acciones).toEqual([{ indice: 0, columna: 'acciones', accion: 'borrar' }]);
    expect(seleccion).toEqual([]);
  });

  it('pagina localmente cuando recibe todas las filas y la búsqueda vuelve a la primera página', () => {
    component.filas = Array.from({ length: 25 }, (_, i) => ({ ref: `R-${i + 1}`, cliente: i < 3 ? 'Ana' : 'Juan' }));
    component.total = 25;
    component.tamanoPagina = 10;
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(10);
    el.querySelector<HTMLButtonElement>('[aria-label="Página 3"]')!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(5);
    expect(el.querySelector('tbody tr td')?.textContent).toContain('R-21');
  });

  it('usa el texto de acción propio de la fila y cae al de la columna', () => {
    component.columnas = [{ key: 'ir', header: '', tipo: 'accion', textoAccion: 'Gestionar' }];
    component.filas = [{ ir: '', irTexto: 'Ver detalle' }, { ir: '' }];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const textos = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody button')].map((b) => b.textContent?.trim());
    expect(textos).toEqual(['Ver detalle', 'Gestionar']);
  });

  describe('selección de filas', () => {
    const preparar = (seleccionadas: string[] = []): string[][] => {
      const emitidas: string[][] = [];
      component.columnas = [{ key: 'poliza', header: 'Póliza' }];
      component.claveFila = 'id';
      component.seleccionable = true;
      component.seleccionadas = seleccionadas;
      component.filas = [
        { id: 'P1', poliza: 'P1', seleccionable: 1 },
        { id: 'P2', poliza: 'P2', seleccionable: 0 },
        { id: 'P3', poliza: 'P3', seleccionable: 1 },
      ];
      component.total = 3;
      component.seleccionadasChange.subscribe((v) => emitidas.push([...v]));
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      return emitidas;
    };
    const casillas = (): HTMLInputElement[] => [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('tbody .dt-sel__casilla')];

    it('muestra una casilla por fila y deshabilita las que no se pueden elegir', () => {
      preparar();
      expect(casillas().map((c) => c.disabled)).toEqual([false, true, false]);
    });

    it('elige y quita una fila sin disparar la fila ni mezclar las demás', () => {
      const emitidas = preparar(['P3']);
      casillas()[0].click();
      expect(emitidas.at(-1)).toEqual(['P3', 'P1']);
      casillas()[2].click();
      expect(emitidas.at(-1)).toEqual([]);
    });

    it('la casilla del encabezado elige solo las filas elegibles de la página', () => {
      const emitidas = preparar();
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('thead .dt-sel__casilla')!.click();
      expect(emitidas.at(-1)).toEqual(['P1', 'P3']);
    });
  });
});
