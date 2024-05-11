import type { Registry } from "./schema";

export const registry: Registry = [
  {
    name: "thread",
    type: "components:ui",
    files: ["assistant-ui/thread.tsx"],
    registryDependencies: ["button", "avatar"],
    dependencies: ["@assistant-ui/react"],
  },
];
