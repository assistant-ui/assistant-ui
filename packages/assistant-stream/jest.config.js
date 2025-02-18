module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleFileExtensions: ["ts", "js"],
  testPathIgnorePatterns: ['/src/core/test.ts']
}; 