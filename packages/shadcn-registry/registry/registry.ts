import { RegistryItem } from "./schema";

export const registry: RegistryItem[] = [
  {
    name: "assistant-ui",
    type: "registry:component",
    registryDependencies: [],
    tailwind: {
      config: {
        plugins: [
          `require("tailwindcss-animate")`,
          `require("@assistant-ui/react/tailwindcss")({ shadcn: true })`,
        ],
      },
    },
    dependencies: ["tailwindcss-animate", "@assistant-ui/react"],
  },
  {
    name: "markdown",
    type: "registry:component",
    registryDependencies: ["https://assistant-ui.com/r/assistant-ui"],
    tailwind: {
      config: {
        plugins: [`require("@assistant-ui/react-markdown/tailwindcss")`],
      },
    },
    dependencies: ["@assistant-ui/react-markdown"],
  },
  {
    name: "edge-backend",
    type: "registry:block",
    files: [
      {
        type: "registry:page",
        path: "routes/api/chat/route.ts",
      },
    ],
    registryDependencies: ["https://assistant-ui.com/r/assistant-ui"],
    dependencies: ["@ai-sdk/openai"],
  },
  {
    name: "chat/quick-start",
    type: "registry:block",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
      },
    ],
    registryDependencies: [
      "https://assistant-ui.com/r/assistant-ui",
      "https://assistant-ui.com/r/markdown",
      "https://assistant-ui.com/r/edge-backend",
    ],
  },
];
