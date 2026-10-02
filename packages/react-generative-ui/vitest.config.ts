import { configDefaults, defineConfig } from "vitest/config";

const temporalTests = [
  "src/temporal.test.ts",
  "src/vocabulary/datepicker.dom.test.tsx",
];

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
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
