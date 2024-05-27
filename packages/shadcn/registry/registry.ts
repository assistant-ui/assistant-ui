import type { RegistryIndex } from "./schema";

export const registry: RegistryIndex = [
  {
    name: "asssitant-modal",
    type: "components:ui",
    files: ["assistant-ui/assistant-modal.tsx"],
    registryDependencies: ["thread", "button", "popover", "tooltip"],
    dependencies: ["@assistant-ui/react"],
  },
  {
    name: "thread",
    type: "components:ui",
    files: ["assistant-ui/thread.tsx"],
    registryDependencies: ["button", "avatar", "tooltip"],
    dependencies: ["@assistant-ui/react"],
  },
];
