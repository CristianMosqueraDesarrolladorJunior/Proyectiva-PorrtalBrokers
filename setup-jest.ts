/**
 * Archivo de inicialización de Jest para pruebas Angular.
 *
 * Configura el entorno de pruebas de Angular basado en Zone.js mediante el
 * preset `jest-preset-angular`. Se ejecuta antes de cada suite de pruebas.
 */
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
