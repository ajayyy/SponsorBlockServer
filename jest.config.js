module.exports = {
    preset: 'ts-jest',
    testMatch: ['<rootDir>/test/cases/*.ts'],
    testEnvironment: '<rootDir>/test/DbEnvironment.ts',
    globalSetup: '<rootDir>/test/globalSetup.ts'
};
