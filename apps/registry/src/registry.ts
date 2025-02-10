import { RegistryItem } from "./schema";

export const registry: RegistryItem[] = [
  {
    name: "chat/b/ai-sdk-quick-start/json",
    type: "registry:block",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/ai-sdk-assistant.tsx",
        target: "components/assistant-ui/assistant.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/thread",
      "https://r.assistant-ui.com/ai-sdk-backend",
    ],
    meta: {
      importSpecifier: "Assistant",
      moduleSpecifier: "@/components/assistant-ui/assistant",
      nextVersion: "15.1.6",
    },
  },
  {
    name: "ai-sdk-backend",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "app/api/chat/route.ts",
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
      "avatar",
      "https://r.assistant-ui.com/markdown-text",
      "https://r.assistant-ui.com/tooltip-icon-button",
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
    registryDependencies: ["https://r.assistant-ui.com/tooltip-icon-button"],
    dependencies: [
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
    ],
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
      "https://r.assistant-ui.com/tooltip-icon-button",
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
      "https://r.assistant-ui.com/tooltip-icon-button",
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
      "https://r.assistant-ui.com/thread",
      "https://r.assistant-ui.com/tooltip-icon-button",
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
    registryDependencies: ["https://r.assistant-ui.com/thread", "resizable"],
  },
];
