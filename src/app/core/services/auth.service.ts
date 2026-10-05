import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { LoginRequest, PerfilBroker } from '../models/broker.model';
import type { ResultadoSarlaftRadicacion } from '../models/radicacion.model';
import {
  RegistroProspectoRequest,
  ResultadoSarlaft,
  SolicitudRegistroBroker,
  VerificacionSarlaftRegistroRequest,
} from '../models/registro-broker.model';
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
  private readonly baseUrl = '/api/v1';

  /**
   * Autentica al Broker y, si es exitoso, publica su perfil en `SessionService` (Req 1, 4.3).
   * @param request credenciales de login (cédula y contraseña).
   * @returns el `PerfilBroker` autenticado.
   */
  login(request: LoginRequest): Observable<PerfilBroker> {
    return this.http
      .post<PerfilBroker>(`${this.baseUrl}/auth/login`, request, {
        withCredentials: true,
      })
      .pipe(tap((perfil) => this.session.establecerPerfil(perfil)));
  }

  /**
   * Cierra la sesión del Broker y limpia su perfil en `SessionService` (Req 4).
   * @returns un `Observable<void>` que completa al cerrar la sesión.
   */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.session.limpiarPerfil()));
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
   * Registra una Solicitud_Registro_Broker en estado pendiente (Req 3).
   * @param solicitud datos personales, SARLAFT y documentos del aspirante.
   * @returns confirmación con radicado y estado de la solicitud.
   */
  registrarSolicitud(
    solicitud: SolicitudRegistroBroker,
  ): Observable<RegistroBrokerResponse> {
    return this.http.post<RegistroBrokerResponse>(
      `${this.baseUrl}/brokers/solicitudesRegistro`,
      solicitud,
      { withCredentials: true },
    );
  }

  /**
   * Ingreso simple: crea la Cuenta en estado PROSPECTO (spec backend, Req 1.2).
   * @param datos datos personales y documento del aspirante.
   * @returns radicado y estado de la cuenta creada.
   */
  registrarProspecto(datos: RegistroProspectoRequest): Observable<RegistroBrokerResponse> {
    return this.http.post<RegistroBrokerResponse>(`${this.baseUrl}/brokers/prospectos`, datos, {
      withCredentials: true,
    });
  }

  /**
   * Verifica el SARLAFT del aspirante con el documento del paso 1. El backend
   * decide la salida: actualizado, desactualizado (URL de actualización) o
   * consultable (el caso pasa a Cumplimiento).
   */
  verificarSarlaftRegistro(
    request: VerificacionSarlaftRegistroRequest,
  ): Observable<ResultadoSarlaftRadicacion> {
    return this.http.post<ResultadoSarlaftRadicacion>(`${this.baseUrl}/sarlaft/consultas`, request, {
      withCredentials: true,
    });
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
}
