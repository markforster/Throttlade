/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "identity-obj-proxy",
    "^react-bootstrap-icons$":
      "<rootDir>/tests/__mocks__/react-bootstrap-icons.tsx",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],
  clearMocks: true,
  watchman: false,
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "<rootDir>/reports/coverage",
  coverageReporters: ["text", "lcov", "html"],
  collectCoverageFrom: [
    "<rootDir>/src/**/*.{ts,tsx,js,jsx}",
    "!<rootDir>/src/**/*.d.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/tests/",
    "<rootDir>/.*/__mocks__/",
  ],
  // HTML test result reporter
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "<rootDir>/reports/jest",
        filename: "index.html",
        expand: true,
        pageTitle: "Jest Test Report",
      },
    ],
  ],
};
