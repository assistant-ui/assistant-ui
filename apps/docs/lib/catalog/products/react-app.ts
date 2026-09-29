import type { CatalogItem } from "../types";

/** The project a setup installs into; agents propose it when they start outside a React app. */
export const reactApp: CatalogItem = {
  slug: "react-app",
  name: "React project",
  tagline:
    "Point the setup at one of your React apps, or start a new one with the framework you pick.",
  href: "/docs/installation",
  purchase: "setup",
  glyph: "react",
  docs: "/docs/installation",
  agentMinutes: [2, 8],
};
