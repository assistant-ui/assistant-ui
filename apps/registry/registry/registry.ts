import { RegistryItem } from "./schema";

export const registry: RegistryItem[] = [
  {
    name: "assistant-ui-tailwind",
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
    name: "markdown-tailwind",
    type: "registry:component",
    tailwind: {
      config: {
        plugins: [`require("@assistant-ui/react-markdown/tailwindcss")`],
      },
    },
    dependencies: ["@assistant-ui/react-markdown"],
    registryDependencies: ["https://r.assistant-ui.com/assistant-ui-tailwind"],
  },
  {
    name: "trieve-tailwind",
    type: "registry:component",
    tailwind: {
      config: {
        plugins: [`require("@assistant-ui/react-trieve/tailwindcss")`],
      },
    },
    dependencies: ["@assistant-ui/react-trieve"],
    registryDependencies: ["https://r.assistant-ui.com/assistant-ui-tailwind"],
  },
  {
    name: "edge-backend",
    type: "registry:block",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
    ],
    dependencies: ["@ai-sdk/openai"],
  },
  {
    name: "quick-start",
    type: "registry:block",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
        target: "components/assistant-ui/my-assistant.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/assistant-ui-tailwind",
      "https://r.assistant-ui.com/markdown-tailwind",
      "https://r.assistant-ui.com/edge-backend",
    ],
  },
  {
    name: "b/chat/quick-start",
    type: "registry:block",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
        target: "components/assistant-ui/my-assistant.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/assistant-ui-tailwind",
      "https://r.assistant-ui.com/markdown-tailwind",
      "https://r.assistant-ui.com/edge-backend",
    ],
  },
  {
    name: "shadcn/thread",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/shadcn/thread.tsx",
        target: "components/assistant-ui/thread.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "avatar",
      "https://r.assistant-ui.com/shadcn/tooltip-icon-button",
    ],
  },
  {
    name: "shadcn/thread-full",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/shadcn/full/thread.tsx",
        target: "components/assistant-ui/thread.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "button",
      "avatar",
      "https://r.assistant-ui.com/shadcn/markdown-text",
      "https://r.assistant-ui.com/shadcn/tooltip-icon-button",
    ],
  },
  {
    name: "shadcn/markdown-text",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/shadcn/markdown-text.tsx",
        target: "components/assistant-ui/markdown-text.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/shadcn/tooltip-icon-button",
      "https://r.assistant-ui.com/shadcn/syntax-highlighter",
    ],
    dependencies: [
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
      "remark-math",
      "rehype-katex",
    ],
  },
  {
    name: "shadcn/tooltip-icon-button",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/shadcn/tooltip-icon-button.tsx",
        target: "components/assistant-ui/tooltip-icon-button.tsx",
      },
    ],
    registryDependencies: ["tooltip", "button"],
  },
  {
    name: "shadcn/syntax-highlighter",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/shadcn/syntax-highlighter.tsx",
        target: "components/assistant-ui/syntax-highlighter.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react-syntax-highlighter",
      "react-syntax-highlighter",
      "@types/react-syntax-highlighter",
    ],
  },
  {
    name: "shadcn/assistant-modal",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/shadcn/assistant-modal.tsx",
        target: "components/assistant-ui/assistant-modal.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "https://r.assistant-ui.com/shadcn/thread",
      "https://r.assistant-ui.com/shadcn/tooltip-icon-button",
    ],
  },
  {
    name: "shadcn/assistant-sidebar",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/shadcn/assistant-sidebar.tsx",
        target: "components/assistant-ui/assistant-sidebar.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "https://r.assistant-ui.com/shadcn/thread",
      "resizable",
    ],
  },
];
