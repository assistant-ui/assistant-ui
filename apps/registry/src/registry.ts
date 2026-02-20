import { RegistryItem } from "./schema";

export const registry: RegistryItem[] = [
  {
    name: "shimmer-style",
    type: "registry:style",
    cssVars: {
      theme: {
        "--animate-shimmer":
          "shimmer-sweep var(--shimmer-duration, 1000ms) linear infinite both",
      },
    },
    css: {
      "@keyframes shimmer-sweep": {
        from: {
          "background-position": "150% 0",
        },
        to: {
          "background-position": "-100% 0",
        },
      },
    },
  },
  {
    name: "chat/b/ai-sdk-quick-start/json",
    type: "registry:page",
    files: [
      {
        type: "registry:page",
        path: "app/ai-sdk/assistant.tsx",
        target: "app/assistant.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/ai-sdk-backend.json",
      "https://r.assistant-ui.com/thread.json",
    ],
    dependencies: ["@assistant-ui/react-ai-sdk"],
    meta: {
      importSpecifier: "Assistant",
      moduleSpecifier: "@/app/assistant",
      nextVersion: "15.1.6",
    },
  },
  {
    name: "ai-sdk-backend",
    type: "registry:page",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
    ],
    dependencies: ["ai", "@ai-sdk/openai"],
  },
  {
    name: "thread",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/thread.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "button",
      "https://r.assistant-ui.com/attachment.json",
      "https://r.assistant-ui.com/markdown-text.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/tool-fallback.json",
    ],
  },
  {
    name: "markdown-text",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/markdown-text.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/markdown-text.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: [
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
    ],
  },
  {
    name: "reasoning",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/reasoning.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/reasoning.tsx",
      },
    ],
    registryDependencies: [
      "collapsible",
      "https://r.assistant-ui.com/markdown-text.json",
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
      "tw-shimmer",
    ],
    css: {
      '@import "tw-shimmer"': {},
    },
  },
  {
    name: "message-timing",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/message-timing.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/message-timing.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: ["tooltip"],
  },
  {
    name: "thread-list",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread-list.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/thread-list.tsx",
      },
    ],
    registryDependencies: [
      "button",
      "skeleton",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "attachment",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/attachment.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/attachment.tsx",
      },
    ],
    registryDependencies: [
      "dialog",
      "tooltip",
      "avatar",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react", "zustand"],
  },
  {
    name: "follow-up-suggestions",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/follow-up-suggestions.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/follow-up-suggestions.tsx",
      },
    ],
    registryDependencies: [],
    dependencies: ["@assistant-ui/react"],
  },
  {
    name: "tooltip-icon-button",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tooltip-icon-button.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tooltip-icon-button.tsx",
      },
    ],
    registryDependencies: ["tooltip", "button"],
  },
  {
    name: "syntax-highlighter",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/syntax-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/syntax-highlighter.ts",
      },
    ],
    dependencies: [
      "@assistant-ui/react-syntax-highlighter",
      "react-syntax-highlighter",
      "@types/react-syntax-highlighter",
    ],
  },
  {
    name: "assistant-modal",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/assistant-modal.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/assistant-modal.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "https://r.assistant-ui.com/thread.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
  },
  {
    name: "assistant-sidebar",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/assistant-sidebar.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/assistant-sidebar.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: [
      "resizable",
      "https://r.assistant-ui.com/thread.json",
    ],
  },
  {
    name: "tool-fallback",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tool-fallback.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tool-fallback.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["collapsible"],
  },
  {
    name: "tool-group",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tool-group.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tool-group.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: ["collapsible"],
    css: {
      '@import "tw-shimmer"': {},
    },
  },
  {
    name: "shiki-highlighter",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/shiki-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/shiki-highlighter.tsx",
      },
    ],
    dependencies: ["react-shiki"],
  },
  {
    name: "mermaid-diagram",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/mermaid-diagram.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/mermaid-diagram.tsx",
      },
    ],
    dependencies: [
      "mermaid",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
    ],
  },
  {
    name: "diff-viewer",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/diff-viewer.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/diff-viewer.tsx",
      },
    ],
    dependencies: [
      "diff",
      "parse-diff",
      "@assistant-ui/react-markdown",
      "class-variance-authority",
    ],
  },
  {
    name: "threadlist-sidebar",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/threadlist-sidebar.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/threadlist-sidebar.tsx",
      },
    ],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "sidebar",
      "https://r.assistant-ui.com/thread-list.json",
    ],
  },
  {
    name: "sources",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/sources.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/sources.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: ["https://r.assistant-ui.com/badge.json"],
  },
  {
    name: "image",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/image.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/image.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: [],
  },
  {
    name: "file",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/file.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/file.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
  },
  {
    name: "model-selector",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/model-selector.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/model-selector.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "@radix-ui/react-select",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: ["select"],
  },
  {
    name: "select",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/select.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/select.tsx",
      },
    ],
    dependencies: [
      "@radix-ui/react-select",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: [],
  },
  {
    name: "badge",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/badge.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/badge.tsx",
      },
    ],
    dependencies: ["@radix-ui/react-slot", "class-variance-authority"],
    registryDependencies: [],
  },
  {
    name: "tabs",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tabs.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/tabs.tsx",
      },
    ],
    dependencies: [
      "@radix-ui/react-tabs",
      "@radix-ui/react-slot",
      "class-variance-authority",
    ],
    registryDependencies: [],
  },
  {
    name: "accordion",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/accordion.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/accordion.tsx",
      },
    ],
    dependencies: [
      "@radix-ui/react-accordion",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: [],
  },
];
