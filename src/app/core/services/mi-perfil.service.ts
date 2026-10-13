import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { SessionService } from './session.service';

/** Perfil editable del usuario interno (Administrador / Comercial). */
export interface PerfilInterno {
  readonly id: string;
  readonly identificador: string;
  readonly nombre: string;
  readonly rol: string;
  readonly documento: string | null;
  readonly telefono: string | null;
  readonly cargo: string | null;
  readonly area: string | null;
  readonly ciudad: string | null;
  readonly codigoComercial: string | null;
  readonly creado: string | null;
  readonly actualizado: string | null;
}

export type CambiosPerfil = Pick<PerfilInterno, 'nombre' | 'documento' | 'telefono' | 'cargo' | 'area' | 'ciudad'>;

/** Formatos y tamaño que acepta el backend para la foto (validados allí por contenido). */
export const FOTO_TIPOS = ['image/jpeg', 'image/png'] as const;
export const FOTO_MAXIMA_BYTES = 2 * 1024 * 1024;

/**
 * Perfil propio de cualquier rol (`/api/v1/auth/perfil`): foto compartida por el sidebar y las
 * páginas de perfil, y datos del usuario interno.
 */
@Injectable({ providedIn: 'root' })
export class MiPerfilService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/auth/perfil';
  private readonly opciones = { withCredentials: true } as const;

  /** URL local (blob) de la foto de la sesión; `null` muestra las iniciales. */
  readonly foto = signal<string | null>(null);
  private cargada = false;

  constructor() {
    // La foto sigue a la sesión: se carga al entrar y se libera al salir (la siguiente cuenta no la hereda).
    const session = inject(SessionService);
    effect(() => {
      const hay = session.perfil() !== null;
      untracked(() => (hay ? this.cargarFoto() : this.olvidar()));
    });
  }

  cargarFoto(forzar = false): void {
    if (this.cargada && !forzar) return;
    this.cargada = true;
    this.http
      .get(`${this.base}/foto`, { ...this.opciones, responseType: 'blob', observe: 'response' })
      .subscribe({
        next: (r) => this.ponerFoto(r.status === 200 && r.body && r.body.size > 0 ? r.body : null),
        error: () => this.ponerFoto(null),
      });
  }

  subirFoto(archivo: File): Observable<void> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.put<void>(`${this.base}/foto`, datos, this.opciones).pipe(tap(() => this.ponerFoto(archivo)));
  }

  quitarFoto(): Observable<void> {
    return this.http.delete<void>(`${this.base}/foto`, this.opciones).pipe(tap(() => this.ponerFoto(null)));
  }

  perfil(): Observable<PerfilInterno> {
    return this.http.get<PerfilInterno>(this.base, this.opciones);
  }

  actualizar(cambios: CambiosPerfil): Observable<PerfilInterno> {
    return this.http.put<PerfilInterno>(this.base, cambios, this.opciones);
  }

  /** Al cerrar sesión: libera la foto para que la siguiente cuenta no la herede. */
  olvidar(): void {
    this.cargada = false;
    this.ponerFoto(null);
  }

  private ponerFoto(blob: Blob | null): void {
    const anterior = this.foto();
    if (anterior) URL.revokeObjectURL(anterior);
    this.foto.set(blob ? URL.createObjectURL(blob) : null);
  }
}
