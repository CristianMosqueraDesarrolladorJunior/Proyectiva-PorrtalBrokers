import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ArchivoSeleccionado,
  DocUploaderComponent,
  ReglaDocumentoUploader,
} from './doc-uploader.component';

describe('DocUploaderComponent', () => {
  let fixture: ComponentFixture<DocUploaderComponent>;
  let component: DocUploaderComponent;

  const reglas: ReglaDocumentoUploader[] = [
    { id: 'rut', etiqueta: 'RUT', descripcion: 'PDF · máx. 10 MB', obligatorio: true },
    { id: 'cedula', etiqueta: 'Cédula', descripcion: 'PDF, JPG o PNG' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DocUploaderComponent] }).compileComponents();
    fixture = TestBed.createComponent(DocUploaderComponent);
    component = fixture.componentInstance;
    component.reglas = reglas;
    fixture.detectChanges();
  });

  it('renderiza un doc-item por regla', () => {
    const items = fixture.nativeElement.querySelectorAll('.doc-item');
    expect(items.length).toBe(2);
  });

  it('acepta únicamente .pdf/.jpg/.jpeg/.png en el input', () => {
    const input = fixture.nativeElement.querySelector('.doc-item__input') as HTMLInputElement;
    expect(input.getAttribute('accept')).toContain('.pdf');
    expect(input.getAttribute('accept')).toContain('.jpg');
    expect(input.getAttribute('accept')).toContain('.jpeg');
    expect(input.getAttribute('accept')).toContain('.png');
  });

  it('emite el archivo seleccionado con su id', () => {
    // Given
    const emitido: ArchivoSeleccionado[] = [];
    component.archivoSeleccionado.subscribe((e) => emitido.push(e));
    const archivo = new File(['x'], 'rut.pdf', { type: 'application/pdf' });
    const input = fixture.nativeElement.querySelector('.doc-item__input') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [archivo] });
    // When
    input.dispatchEvent(new Event('change'));
    // Then
    expect(emitido.length).toBe(1);
    expect(emitido[0].id).toBe('rut');
    expect(emitido[0].archivo.name).toBe('rut.pdf');
  });

  it('marca los documentos ya cargados', () => {
    fixture.componentRef.setInput('cargados', { rut: 'rut.pdf' });
    fixture.detectChanges();
    const cargado = fixture.nativeElement.querySelector('.doc-info__cargado');
    expect(cargado?.textContent).toContain('rut.pdf');
  });
});
