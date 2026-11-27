"use client";

import { DocsFooter as DocsThemeFooter } from "@assistant-ui/docs-theme/ui";
import {
  usePlatformNeighbours,
  type NeighboursByPlatform,
} from "@/hooks/use-platform-neighbours";
import type { DocsNeighbours } from "@/lib/docs-neighbours";

export function DocsFooter({
  previous,
  next,
  neighboursByPlatform,
}: DocsNeighbours & {
  neighboursByPlatform?: NeighboursByPlatform | undefined;
}) {
  const neighbours = usePlatformNeighbours(
    { previous, next },
    neighboursByPlatform,
  );
  return (
    <DocsThemeFooter previous={neighbours.previous} next={neighbours.next} />
  );
}
