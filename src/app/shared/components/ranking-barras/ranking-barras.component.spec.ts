import { TestBed } from '@angular/core/testing';

import { RankingBarrasComponent } from './ranking-barras.component';

describe('RankingBarrasComponent', () => {
  it('ordena de mayor a menor y escala las barras contra el máximo', () => {
    const fixture = TestBed.createComponent(RankingBarrasComponent);
    fixture.componentRef.setInput('titulo', 'Top');
    fixture.componentRef.setInput('items', [
      { etiqueta: 'B', valor: 5 },
      { etiqueta: 'A', valor: 10 },
      { etiqueta: 'C', valor: 0 },
    ]);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const barras = Array.from(el.querySelectorAll<HTMLElement>('.rb__barra')).map((b) => b.style.width);
    expect(barras).toEqual(['100%', '50%', '2%']);
    expect(el.textContent!.indexOf('A')).toBeLessThan(el.textContent!.indexOf('B'));
  });
});
