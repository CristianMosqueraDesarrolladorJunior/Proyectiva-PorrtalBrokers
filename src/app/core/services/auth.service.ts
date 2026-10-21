import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';

import { LoginRequest, PerfilBroker, PerfilCompartido } from '../models/broker.model';
import {
  CrearProspectoPayload,
  RegistroProspectoRequest,
  ResultadoSarlaft,
} from '../models/registro-broker.model';
import { BorradorRadicacionService } from './borrador-radicacion.service';
import { SessionService } from './session.service';

/**
 * Parámetros de la Consulta_SARLAFT (documento + fecha de expedición) (Req 3).
 * El backend es la fuente autoritativa del resultado.
 */
export interface ConsultaSarlaftRequest {
  readonly documento: string;
  readonly fechaExpedicion: string; // ISO-8601
}

/**
 * Confirmación de una Solicitud_Registro_Broker registrada como pendiente (Req 3).
 */
export interface RegistroBrokerResponse {
  readonly radicado: string;
  readonly estado: string;
}

/**
 * Servicio de autenticación y registro del Broker (Req 1, 2, 3, 4).
 *
 * Encapsula el consumo REST del Servicio_Autenticacion del API_Backend vía
 * `HttpClient` con tipado estricto y `withCredentials: true` (cookie `HttpOnly`,
 * Req 28.1). Tras un login exitoso establece el `PerfilBroker` en `SessionService`
 * y tras el logout lo limpia; nunca lee ni almacena el token en JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly borrador = inject(BorradorRadicacionService);
  private readonly baseUrl = '/api/v1';

  /**
   * Autentica al Broker y, si es exitoso, publica su perfil en `SessionService` (Req 1, 4.3).
   * @param request credenciales de login (cédula o correo, y contraseña).
   * @returns el `PerfilBroker` autenticado.
   */
  login(request: LoginRequest): Observable<PerfilBroker> {
    return this.http
      .post<PerfilBroker>(`${this.baseUrl}/auth/login`, request, {
        withCredentials: true,
      })
      .pipe(tap((perfil) => this.nuevaSesion(perfil)));
  }

  /**
   * Inicia sesión con el token que entrega Cien Cuadras al broker ya autenticado.
   * El backend verifica el token y establece la cookie `HttpOnly`; el token no se
   * guarda en JavaScript.
   * @param idToken token emitido por el proveedor de identidad compartido.
   * @returns el `PerfilBroker` autenticado.
   */
  ingresarConToken(idToken: string): Observable<PerfilBroker> {
    return this.http
      .post<PerfilBroker>(`${this.baseUrl}/auth/sso`, { idToken }, { withCredentials: true })
      .pipe(tap((perfil) => this.nuevaSesion(perfil)));
  }

  /**
   * Solicita el correo para crear o cambiar la contraseña. El backend responde
   * igual exista o no la cuenta.
   * @param usuario cédula o correo.
   */
  restablecerPassword(usuario: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/restablecimiento`, { usuario });
  }

  /**
   * Datos que el usuario de la sesión ya registró en Cien Cuadras, para
   * autocompletar el onboarding. Emite `null` cuando no hay datos (204).
   */
  perfilCompartido(): Observable<PerfilCompartido | null> {
    return this.http.get<PerfilCompartido | null>(`${this.baseUrl}/auth/perfil-compartido`, {
      withCredentials: true,
    });
  }

  /**
   * Cierra la sesión del Broker y limpia su perfil en `SessionService` (Req 4).
   * @returns un `Observable<void>` que completa al cerrar la sesión.
   */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      // El perfil local se limpia aunque el servidor falle: la sesión se da por cerrada en el cliente.
      .pipe(
        finalize(() => {
          this.session.limpiarPerfil();
          this.borrador.limpiar();
        }),
      );
  }

  /** Login, ingreso con token o registro: otra cuenta puede estar entrando en este navegador. */
  private nuevaSesion(perfil: PerfilBroker): void {
    // El borrador de radicación (sessionStorage) es de la cuenta anterior: no debe verlo la nueva.
    this.borrador.limpiar();
    this.session.establecerPerfil(perfil);
  }

  /**
   * Rehidrata el perfil del Broker autenticado desde la cookie de sesión (Req 4.3).
   * @returns el `PerfilBroker` de la sesión vigente.
   */
  sesion(): Observable<PerfilBroker> {
    return this.http
      .get<PerfilBroker>(`${this.baseUrl}/auth/session`, {
        withCredentials: true,
      })
      .pipe(tap((perfil) => this.session.establecerPerfil(perfil)));
  }

  /**
   * Ingreso simple: crea la Cuenta en estado PROSPECTO (spec backend, Req 1.2).
   * @param datos datos personales y documento del aspirante.
   * @returns radicado y estado de la cuenta creada.
   */
  registrarProspecto(datos: RegistroProspectoRequest): Observable<RegistroBrokerResponse> {
    // Mapea el modelo del front al contrato REST del backend (CrearProspectoRequest):
    // documento -> cedula, nombreCompleto -> nombre. El backend ignora codigoPais/ciudad/tipoDocumento.
    const payload: CrearProspectoPayload = {
      cedula: datos.documento,
      nombre: datos.nombreCompleto,
      telefono: datos.telefono,
      correo: datos.correo,
      ciudad: datos.ciudad,
      tipoDocumento: datos.tipoDocumento,
      codigoPais: datos.codigoPais,
      password: datos.password,
      declaracionInmobiliaria: datos.declaracionInmobiliaria,
      aceptaTratamientoDatos: datos.aceptaTratamientoDatos,
    };
    return this.http
      .post<RegistroBrokerResponse>(`${this.baseUrl}/brokers/prospectos`, payload, { withCredentials: true })
      // El registro deja abierta la sesión de la cuenta nueva: se descarta el borrador de la anterior.
      .pipe(tap(() => this.borrador.limpiar()));
  }

  /**
   * Ejecuta la Consulta_SARLAFT del aspirante (Req 3).
   * @param request documento y fecha de expedición a verificar.
   * @returns el `ResultadoSarlaft` retornado por el backend.
   */
  consultarSarlaft(
    request: ConsultaSarlaftRequest,
  ): Observable<ResultadoSarlaft> {
    return this.http.post<ResultadoSarlaft>(
      `${this.baseUrl}/sarlaft/consultas`,
      request,
      { withCredentials: true },
    );
  }

  /** Cambia la clave del usuario de la sesión (obligatorio tras una credencial generada por el portal). */
  cambiarClave(actual: string, nueva: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/clave`, { actual, nueva }, { withCredentials: true })
      .pipe(
        tap(() => {
          const perfil = this.session.perfil();
          if (perfil) this.session.establecerPerfil({ ...perfil, debeCambiarClave: false });
        }),
      );
  }
}
