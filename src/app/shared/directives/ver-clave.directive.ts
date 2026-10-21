import { AfterViewInit, Directive, ElementRef, OnDestroy, Renderer2, inject } from '@angular/core';

/**
 * Agrega el «ojo» para ver u ocultar lo escrito en un campo de contraseña. No cambia el formulario ni el control: solo
 * envuelve el `<input>` y alterna su `type` entre `password` y `text`. El botón es accesible (`aria-pressed`, etiqueta
 * y foco visible).
 */
@Directive({ selector: 'input[appVerClave]', standalone: true })
export class VerClaveDirective implements AfterViewInit, OnDestroy {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly r = inject(Renderer2);
  private quitarEscucha: (() => void) | null = null;

  ngAfterViewInit(): void {
    const padre = this.input.parentElement;
    if (!padre) {
      return;
    }
    const envoltura = this.r.createElement('span') as HTMLElement;
    this.r.setStyle(envoltura, 'position', 'relative');
    this.r.setStyle(envoltura, 'display', 'block');
    this.r.setStyle(envoltura, 'width', '100%');
    this.r.insertBefore(padre, envoltura, this.input);
    this.r.appendChild(envoltura, this.input);
    this.r.setStyle(this.input, 'padding-right', 'var(--space-8)');

    const boton = this.r.createElement('button') as HTMLButtonElement;
    const icono = this.r.createElement('span') as HTMLElement;
    this.r.addClass(icono, 'material-symbols-outlined');
    this.r.setAttribute(icono, 'aria-hidden', 'true');
    this.r.setStyle(icono, 'font-size', '20px');
    icono.textContent = 'visibility';
    this.r.setAttribute(boton, 'type', 'button');
    this.r.setAttribute(boton, 'aria-label', 'Mostrar contraseña');
    this.r.setAttribute(boton, 'aria-pressed', 'false');
    const estilos: Record<string, string> = {
      position: 'absolute',
      top: '50%',
      right: 'var(--space-3)',
      transform: 'translateY(-50%)',
      display: 'inline-flex',
      padding: 'var(--space-1)',
      border: 'none',
      'border-radius': 'var(--radius-full)',
      background: 'transparent',
      color: 'var(--color-muted)',
      cursor: 'pointer',
    };
    Object.entries(estilos).forEach(([k, v]) => this.r.setStyle(boton, k, v));
    this.r.appendChild(boton, icono);
    this.r.appendChild(envoltura, boton);

    this.quitarEscucha = this.r.listen(boton, 'click', () => {
      const visible = this.input.type === 'password';
      this.input.type = visible ? 'text' : 'password';
      icono.textContent = visible ? 'visibility_off' : 'visibility';
      this.r.setAttribute(boton, 'aria-pressed', String(visible));
      this.r.setAttribute(boton, 'aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  }

  ngOnDestroy(): void {
    this.quitarEscucha?.();
  }
}
