import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "dev",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          globals: true,
        },
      },
      {
        // Runs the differential parity suite against the production React
        // build with tap's dev-mode (strict emulation) compiled out.
        test: {
          name: "prod",
          environment: "jsdom",
          include: ["src/__tests__/parity/*.test.{ts,tsx}"],
          globals: true,
          env: { NODE_ENV: "production" },
          server: {
            deps: {
              // The host benchmark imports the built package; serve dist as a
              // plain Node module so vitest's evaluator doesn't skew numbers.
              external: [/packages\/tap\/dist\//],
            },
          },
        },
      },
    ],
  },
});
