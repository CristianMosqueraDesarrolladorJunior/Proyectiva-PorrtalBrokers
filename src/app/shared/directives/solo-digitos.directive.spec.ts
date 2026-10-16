import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SoloDigitosDirective } from './solo-digitos.directive';

@Component({
  standalone: true,
  imports: [FormsModule, SoloDigitosDirective],
  template: `
    <input id="cc" appSoloDigitos [ngModel]="cc()" (ngModelChange)="cc.set($event)" />
    <input id="pa" [appSoloDigitos]="false" [ngModel]="pa()" (ngModelChange)="pa.set($event)" />
  `,
})
class AnfitrionComponent {
  readonly cc = signal('');
  readonly pa = signal('');
}

describe('SoloDigitosDirective', () => {
  it('quita letras y separadores al escribir o pegar, salvo cuando está desactivada', async () => {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const escribir = (id: string, valor: string) => {
      const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      return input;
    };
    const cc = escribir('cc', '11.234abc567');
    expect(cc.value).toBe('11234567');
    expect(fixture.componentInstance.cc()).toBe('11234567');
    expect(cc.getAttribute('inputmode')).toBe('numeric');
    escribir('pa', 'AB12345');
    expect(fixture.componentInstance.pa()).toBe('AB12345');
  });
});
