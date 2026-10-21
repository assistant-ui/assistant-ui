import { vi } from "vitest";

// Vitest runs "use cache" functions as plain calls, and cacheLife() throws outside a cacheComponents build.
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: () => {},
}));
