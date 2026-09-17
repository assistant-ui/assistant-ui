import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    fsModuleCache: true,
    projects: [
      {
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
            "@/components/ui": resolve(
              __dirname,
              "src/components/react/ui/base",
            ),
            "@": resolve(__dirname, "src"),
          },
        },
        test: {
          name: "web",
          environment: "jsdom",
          pool: "threads",
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/components/react-native/**"],
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
