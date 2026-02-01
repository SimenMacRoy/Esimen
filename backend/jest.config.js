module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: ['server.js'],
    coverageDirectory: 'coverage',
    verbose: true,
    testTimeout: 30000,
    setupFilesAfterEnv: ['./tests/setup.js']
};
