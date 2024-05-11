import type { Registry } from "./schema";

export const registry: Registry = [
  {
    name: "thread",
    type: "components:ui",
    files: ["assistant-ui/carousel.tsx"],
    registryDependencies: ["button"],
    dependencies: ["embla-carousel-react"],
  },
];
