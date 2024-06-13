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
    name: "thread-full",
    type: "components:ui",
    files: ["assistant-ui/full/thread.tsx"],
    registryDependencies: ["button", "avatar", "tooltip"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
];
