import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const newYorkTests = ["src/components/vue/assistant-ui/thread-list.test.ts"];

const web = {
  plugins: [vue()],
  resolve: {
    alias: {
      "@/components/assistant-ui": resolve(
        __dirname,
        "src/components/react/assistant-ui",
      ),
      "@/components/ui/radix": resolve(
        __dirname,
        "src/components/react/ui/radix",
      ),
      "@/components/ui": resolve(__dirname, "src/components/react/ui/base"),
      "@": resolve(__dirname, "src"),
    },
  },
};

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx,vue}"],
      thresholds: {
        lines: 88,
        functions: 85,
        branches: 80,
        statements: 86,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    fsModuleCache: true,
    projects: [
      {
        ...web,
        test: {
          name: "web",
          environment: "jsdom",
          pool: "threads",
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/components/react-native/**", ...newYorkTests],
        },
      },
      {
        ...web,
        test: {
          name: "web-new-york",
          environment: "jsdom",
          pool: "forks",
          globals: true,
          include: newYorkTests,
          env: { TZ: "America/New_York" },
        },
      },
      {
        resolve: {
          extensions: [
            ".web.tsx",
            ".web.ts",
            ".web.jsx",
            ".web.js",
            ".mjs",
            ".js",
            ".mts",
            ".ts",
            ".jsx",
            ".tsx",
            ".json",
          ],
          alias: {
            "react-native": "react-native-web",
            "react-native-svg": resolve(
              __dirname,
              "node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js",
            ),
            "@/components/assistant-ui": resolve(
              __dirname,
              "src/components/react-native/assistant-ui",
            ),
            "@/components/ui": resolve(
              __dirname,
              "src/components/react-native/ui",
            ),
            "@": resolve(__dirname, "src"),
          },
        },
        test: {
          name: "react-native",
          server: {
            deps: {
              inline: ["lucide-react-native", "react-native-svg", "uniwind"],
            },
          },
          environment: "jsdom",
          pool: "threads",
          globals: true,
          include: ["src/components/react-native/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});
