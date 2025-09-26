/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '^react-bootstrap-icons$': '<rootDir>/tests/__mocks__/react-bootstrap-icons.tsx',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  clearMocks: true,
};
