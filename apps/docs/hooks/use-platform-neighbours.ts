"use client";

import { useSurfaceOrDefault } from "@/components/pages/docs/platform/context";
import type { Surface } from "@/lib/constants";
import type { DocsNeighbours } from "@/lib/docs-neighbours";

export type NeighboursByPlatform = Partial<Record<Surface, DocsNeighbours>>;

// A page several surfaces share is prerendered once, so it carries each
// surface's neighbours and the reader's surface picks them after hydration.
export function usePlatformNeighbours(
  fallback: DocsNeighbours,
  byPlatform: NeighboursByPlatform | undefined,
): DocsNeighbours {
  const surface = useSurfaceOrDefault();
  return byPlatform?.[surface] ?? fallback;
}
