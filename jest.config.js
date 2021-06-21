module.exports = {
    preset: 'ts-jest',
    testMatch: ['**/*.ts'],
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/test/globalSetup.ts'],
    globalTeardown: '<rootDir>/test/globalTeardown.ts'
};
