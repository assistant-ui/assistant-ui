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
      "https://r.assistant-ui.com/thread-list.json",
    ],
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
    dependencies: ["@assistant-ui/react-ai-sdk", "ai", "@ai-sdk/openai"],
  },
  {
    name: "thread",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
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
      },
    ],
    registryDependencies: [
      "collapsible",
      "https://r.assistant-ui.com/markdown-text.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react", "tw-shimmer"],
    css: {
      "@import": "tw-shimmer",
    },
  },
  {
    name: "thread-list",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread-list.tsx",
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
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["button"],
  },
  {
    name: "shiki-highlighter",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/shiki-highlighter.tsx",
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
      },
    ],
    dependencies: [
      "mermaid",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
    ],
  },
  {
    name: "threadlist-sidebar",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/threadlist-sidebar.tsx",
      },
    ],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "sidebar",
      "https://r.assistant-ui.com/thread-list.json",
    ],
  },
];
