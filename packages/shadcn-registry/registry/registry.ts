import type { RegistryIndex } from "./schema";

export const registry: RegistryIndex = [
  {
    name: "sidebar",
    type: "components:ui",
    files: ["assistant-ui/assistant-sidebar.tsx"],
    registryDependencies: ["thread", "resizable"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "modal",
    type: "components:ui",
    files: ["assistant-ui/assistant-modal.tsx"],
    registryDependencies: ["thread", "tooltip-icon-button"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "thread",
    type: "components:ui",
    files: ["assistant-ui/thread.tsx"],
    registryDependencies: ["avatar", "tooltip-icon-button"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "syntax-highlighter",
    type: "components:ui",
    files: ["assistant-ui/syntax-highlighter.tsx"],
    dependencies: [
      "@assistant-ui/react-syntax-highlighter",
      "react-syntax-highlighter",
      "@types/react-syntax-highlighter",
    ],
  },
  {
    name: "markdown-text",
    type: "components:ui",
    files: ["assistant-ui/markdown-text.tsx"],
    registryDependencies: ["tooltip-icon-button", "syntax-highlighter"],
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
      "remark-math",
      "rehype-katex",
    ],
  },
  {
    name: "thread-full",
    type: "components:ui",
    files: ["assistant-ui/full/thread.tsx"],
    registryDependencies: [
      "markdown-text",
      "button",
      "avatar",
      "tooltip-icon-button",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "tooltip-icon-button",
    type: "components:ui",
    files: ["assistant-ui/tooltip-icon-button.tsx"],
    registryDependencies: ["button", "tooltip"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
];
