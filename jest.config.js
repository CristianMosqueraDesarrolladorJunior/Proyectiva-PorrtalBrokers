/**
 * Configuración de Jest para el Portal de Autogestión de Brokers.
 *
 * Usa `jest-preset-angular` para compilar y ejecutar pruebas de componentes,
 * servicios y lógica pura Angular con TypeScript estricto (Req 26.6).
 * Las pruebas basadas en propiedades (`fast-check`) se colocan junto a la
 * lógica pura que validan (ver Testing Strategy del design.md).
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.model.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@angular|rxjs|fast-check)']
};
