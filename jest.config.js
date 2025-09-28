module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/server', '<rootDir>/tests'],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    collectCoverageFrom: [
        'server/**/*.js',
        '!server/index.js',
        '!server/config/**',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 10000
};