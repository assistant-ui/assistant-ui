/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'pnpm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'command',
  commandRunner: { 
    command: 'pnpm test'
  },
  coverageAnalysis: 'off',
  mutate: ['src/runtimes/utils/MessageRepository.tsx'],
  timeoutFactor: 4,
  timeoutMS: 60000,
};