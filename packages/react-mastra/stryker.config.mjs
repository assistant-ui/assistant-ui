const strykerConfig = {
  packageManager: "pnpm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "command",
  commandRunner: {
    command: "pnpm test",
  },
  coverageAnalysis: "off",
  mutate: [
    "src/useMastraRuntime.ts",
    "src/useMastraMessages.ts",
    "src/convertMastraMessages.ts",
    "src/MastraMessageAccumulator.ts",
    "src/appendMastraChunk.ts",
  ],
  timeoutFactor: 4,
  timeoutMS: 60000,
  ignorePatterns: [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/testUtils.ts",
    "**/testSetup.ts",
  ],
};

export default strykerConfig;