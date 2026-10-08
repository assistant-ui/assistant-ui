import { configDefaults, defineConfig } from "vitest/config";

const temporalTests = [
  "src/temporal.test.ts",
  "src/vocabulary/datepicker.dom.test.tsx",
];

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 97,
        functions: 98,
        branches: 91,
        statements: 96,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    pool: "threads",
    fsModuleCache: true,
    projects: [
      {
        test: {
          name: "default",
          exclude: [...configDefaults.exclude, ...temporalTests],
        },
      },
      {
        test: {
          name: "temporal",
          include: temporalTests,
          pool: "forks",
          env: { TZ: "America/New_York" },
        },
      },
    ],
  },
});
