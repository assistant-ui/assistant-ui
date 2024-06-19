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
    registryDependencies: ["thread", "button", "popover", "tooltip"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "thread",
    type: "components:ui",
    files: ["assistant-ui/thread.tsx"],
    registryDependencies: ["avatar"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "unstable-codeblock",
    type: "components:ui",
    files: ["assistant-ui/experimental/codeblock.tsx"],
    registryDependencies: ["button"],
    dependencies: [
      "react-syntax-highlighter",
      "@types/react-syntax-highlighter",
      "lucide-react",
    ],
  },
  {
    name: "unstable-markdown-text",
    type: "components:ui",
    files: ["assistant-ui/experimental/markdown-text.tsx"],
    // registryDependencies: ["unstable-codeblock"],
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
      "remark-gfm",
      "remark-math",
    ],
  },
  {
    name: "unstable-thread-full",
    type: "components:ui",
    files: ["assistant-ui/experimental/thread.tsx"],
    registryDependencies: [
      "unstable-markdown-text",
      "button",
      "avatar",
      "tooltip",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "thread-full",
    type: "components:ui",
    files: ["assistant-ui/full/thread.tsx"],
    registryDependencies: ["button", "avatar", "tooltip"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
];
