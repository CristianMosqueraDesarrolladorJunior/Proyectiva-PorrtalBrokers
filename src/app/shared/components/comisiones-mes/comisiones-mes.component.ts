import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { cop, copCompacto } from '../../../core/services/admin.helpers';

/** Un día del mes por inicio de vigencia (respuesta de /calendario/comisiones y /admin/consola/comisiones-por-dia). */
export interface ComisionDia {
  readonly dia: string;
  readonly total: number;
  readonly comisionNuevas: number;
  readonly comisionRenovadas: number;
  readonly totalPendiente: number;
  readonly comisionPendiente: number;
}

interface Celda {
  readonly fecha: string;
  readonly numero: number;
  readonly d: ComisionDia | null;
  /** Alturas en % de la barra más alta del mes (un solo eje para las dos barras). */
  readonly hTotal: number;
  readonly hRenovadas: number;
  readonly hNuevas: number;
  readonly hPendiente: number;
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Plata del mes sobre los días del calendario, por inicio de vigencia: una barra con el total de las pólizas y otra con
 * la comisión del día, separada en renovaciones renovadas, pólizas nuevas y lo pendiente por renovar (estimado con la
 * vigencia anterior, rayado). Las dos barras comparten un solo eje para que se puedan comparar.
 */
@Component({
  selector: 'app-comisiones-mes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="cm" [attr.aria-label]="'Pólizas y comisiones por día de ' + titulo()">
      <figcaption class="cm__cabecera">
        <div>
          <p class="cm__titulo">Plata por día · {{ titulo() }}</p>
          <p class="cm__nota">Por fecha de inicio de vigencia. Las dos barras usan la misma escala.</p>
        </div>
        <ul class="cm__leyenda">
          <li><span class="cm__muestra cm__muestra--total"></span>Total de las pólizas</li>
          <li><span class="cm__muestra cm__muestra--renovadas"></span>Comisión de renovaciones</li>
          <li><span class="cm__muestra cm__muestra--nuevas"></span>Comisión de pólizas nuevas</li>
          <li><span class="cm__muestra cm__muestra--pendiente"></span>Pendiente por renovar (estimado)</li>
        </ul>
      </figcaption>

      <dl class="cm__totales">
        <div><dt>Total de las pólizas</dt><dd>{{ cop(totales().total) }}</dd></div>
        <div><dt>Comisión de renovaciones</dt><dd>{{ cop(totales().renovadas) }}</dd></div>
        <div><dt>Comisión de nuevas</dt><dd>{{ cop(totales().nuevas) }}</dd></div>
        <div><dt>Pendiente por renovar</dt><dd>{{ cop(totales().pendiente) }}</dd></div>
      </dl>

      <div class="cm__grid" aria-hidden="true">
        @for (n of dias; track n) {
          <span class="cm__semana">{{ n }}</span>
        }
        @for (c of celdas(); track $index) {
          @if (c) {
            <div class="cm__dia" [class.cm__dia--con]="!!c.d" (mouseenter)="activo.set(c)" (mouseleave)="activo.set(null)">
              <span class="cm__numero">{{ c.numero }}</span>
              <div class="cm__barras">
                <span class="cm__barra cm__barra--total" [style.height.%]="c.hTotal"></span>
                <span class="cm__pila">
                  <span class="cm__seg cm__seg--pendiente" [style.height.%]="c.hPendiente"></span>
                  <span class="cm__seg cm__seg--nuevas" [style.height.%]="c.hNuevas"></span>
                  <span class="cm__seg cm__seg--renovadas" [style.height.%]="c.hRenovadas"></span>
                </span>
              </div>
              @if (activo() === c && c.d; as d) {
                <div class="cm__tip" role="tooltip">
                  <strong>{{ c.numero }} de {{ titulo() }}</strong>
                  <span>Total pólizas: {{ cop(d.total) }}</span>
                  <span>Comisión renovaciones: {{ cop(d.comisionRenovadas) }}</span>
                  <span>Comisión nuevas: {{ cop(d.comisionNuevas) }}</span>
                  <span>Pendiente por renovar: {{ cop(d.comisionPendiente) }} (de {{ cop(d.totalPendiente) }})</span>
                </div>
              }
            </div>
          } @else {
            <span class="cm__vacio"></span>
          }
        }
      </div>

      <table class="cm__tabla">
        <caption>Pólizas y comisiones por día de {{ titulo() }}</caption>
        <thead><tr><th>Día</th><th>Total pólizas</th><th>Comisión renovaciones</th><th>Comisión nuevas</th><th>Pendiente por renovar</th></tr></thead>
        <tbody>
          @for (d of datos(); track d.dia) {
            <tr><td>{{ d.dia }}</td><td>{{ cop(d.total) }}</td><td>{{ cop(d.comisionRenovadas) }}</td><td>{{ cop(d.comisionNuevas) }}</td><td>{{ cop(d.comisionPendiente) }}</td></tr>
          }
        </tbody>
      </table>
      @if (!datos().length) {
        <p class="cm__nota">Este mes no tiene pólizas que arranquen vigencia ni renovaciones pendientes.</p>
      }
    </figure>
  `,
  styles: [
    `
      :host { display: block; }
      .cm { margin: 0; padding: var(--space-4); background: var(--sb-surface, #fff); border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-lg, 12px); }
      .cm__cabecera { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
      .cm__titulo { margin: 0; font-weight: var(--font-weight-semibold, 600); color: var(--color-text, #0f172a); }
      .cm__nota { margin: var(--space-1) 0 0; font-size: var(--text-caption, 12px); color: var(--color-muted, #64748b); }
      .cm__leyenda { display: flex; flex-wrap: wrap; gap: var(--space-3); margin: 0; padding: 0; list-style: none; font-size: var(--text-caption, 12px); color: var(--color-text, #0f172a); }
      .cm__leyenda li { display: inline-flex; align-items: center; gap: 6px; }
      .cm__muestra { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
      .cm__muestra--total, .cm__barra--total { background: #3b82f6; }
      .cm__muestra--renovadas, .cm__seg--renovadas { background: #ea580c; }
      .cm__muestra--nuevas, .cm__seg--nuevas { background: #059669; }
      .cm__muestra--pendiente, .cm__seg--pendiente {
        background: repeating-linear-gradient(45deg, #ea580c 0 2px, #ffffff 2px 5px);
        box-shadow: inset 0 0 0 1px #ea580c;
      }
      .cm__totales { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); margin: 0 0 var(--space-3); }
      .cm__totales div { display: flex; flex-direction: column; gap: 2px; }
      .cm__totales dt { font-size: var(--text-caption, 12px); color: var(--color-muted, #64748b); }
      .cm__totales dd { margin: 0; font-weight: var(--font-weight-semibold, 600); color: var(--color-text, #0f172a); }
      .cm__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
      .cm__semana { font-size: var(--text-caption, 12px); color: var(--color-muted, #64748b); text-align: center; }
      .cm__dia { position: relative; height: 92px; padding: 4px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; display: flex; flex-direction: column; }
      .cm__numero { font-size: var(--text-caption, 12px); color: var(--color-muted, #64748b); }
      .cm__barras { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 2px; }
      .cm__barra, .cm__pila { width: 12px; max-height: 100%; }
      .cm__barra { border-radius: 4px 4px 0 0; }
      .cm__pila { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px; }
      .cm__seg { display: block; width: 100%; flex: none; }
      .cm__pila .cm__seg:first-child { border-radius: 4px 4px 0 0; }
      .cm__tip { position: absolute; z-index: 5; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); min-width: 220px;
        display: flex; flex-direction: column; gap: 2px; padding: var(--space-2); background: var(--sb-surface, #fff);
        border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; font-size: var(--text-caption, 12px); color: var(--color-text, #0f172a);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12); pointer-events: none; }
      .cm__tabla { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .cm__totales { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .cm__dia { height: 64px; }
        .cm__barra, .cm__pila { width: 7px; }
      }
    `,
  ],
})
export class ComisionesMesComponent {
  /** Mes mostrado, {@code AAAA-MM}. */
  readonly mes = input.required<string>();
  readonly datos = input<readonly ComisionDia[]>([]);

  protected readonly dias = DIAS;
  protected readonly activo = signal<Celda | null>(null);
  protected readonly cop = (v: number) => (Math.abs(v) >= 1_000_000 ? copCompacto(v) : cop(v));

  protected readonly titulo = computed(() => {
    const [a, m] = this.mes().split('-').map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  });

  protected readonly totales = computed(() =>
    this.datos().reduce(
      (t, d) => ({
        total: t.total + d.total,
        renovadas: t.renovadas + d.comisionRenovadas,
        nuevas: t.nuevas + d.comisionNuevas,
        pendiente: t.pendiente + d.comisionPendiente,
      }),
      { total: 0, renovadas: 0, nuevas: 0, pendiente: 0 },
    ),
  );

  /** Celdas del mes (lunes primero) con las alturas en una sola escala: la barra más alta del mes es el 100 %. */
  protected readonly celdas = computed<readonly (Celda | null)[]>(() => {
    const [a, m] = this.mes().split('-').map(Number);
    const porDia = new Map(this.datos().map((d) => [d.dia.slice(0, 10), d]));
    const maximo = Math.max(1, ...this.datos().map((d) => Math.max(d.total, d.comisionRenovadas + d.comisionNuevas + d.comisionPendiente)));
    const pct = (v: number) => (v > 0 ? Math.max(2, (v / maximo) * 100) : 0);
    const primero = (new Date(a, m - 1, 1).getDay() + 6) % 7;
    const total = new Date(a, m, 0).getDate();
    const celdas: (Celda | null)[] = Array.from({ length: primero }, () => null);
    for (let n = 1; n <= total; n++) {
      const fecha = `${a}-${String(m).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const d = porDia.get(fecha) ?? null;
      celdas.push({
        fecha,
        numero: n,
        d,
        hTotal: d ? pct(d.total) : 0,
        hRenovadas: d ? pct(d.comisionRenovadas) : 0,
        hNuevas: d ? pct(d.comisionNuevas) : 0,
        hPendiente: d ? pct(d.comisionPendiente) : 0,
      });
    }
    return celdas;
  });
}
