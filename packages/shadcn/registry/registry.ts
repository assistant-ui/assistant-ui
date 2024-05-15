import type { RegistryIndex } from "./schema";

export const registry: RegistryIndex = [
  {
    name: "thread",
    type: "components:ui",
    files: ["assistant-ui/thread.tsx"],
    registryDependencies: ["button", "avatar", "tooltip"],
    dependencies: ["@assistant-ui/react"],
  },
];
