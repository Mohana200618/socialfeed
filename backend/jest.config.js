export default {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
