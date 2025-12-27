"use client";

import { makeToolUI } from "../factories/make-tool-ui";
import { MediaCard } from "../components/media-card";
import { serializableMediaCardSchema } from "../schemas/media-card";

/**
 * Pre-built tool UI for media display tools (images, videos, audio, links).
 *
 * Expected tool args shape:
 * - kind: "image" | "video" | "audio" | "link"
 * - src?: string
 * - href?: string
 * - title?: string
 * - description?: string
 *
 * @example
 * ```tsx
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <MediaCardToolUI />
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export const MediaCardToolUI = makeToolUI({
  toolName: "show_media",
  schema: serializableMediaCardSchema,
  render: ({ data, status }) => (
    <MediaCard {...data} isLoading={status.type === "running"} />
  ),
  transform: (args: unknown) => {
    const a = args as Record<string, unknown>;
    return {
      id: `media-${Date.now()}`,
      kind: (a["kind"] ?? "link") as string,
      src: a["src"] as string | undefined,
      href: a["href"] as string | undefined,
      title: a["title"] as string | undefined,
      description: a["description"] as string | undefined,
      alt: a["alt"] as string | undefined,
      footerActions: a["footerActions"] as unknown,
    };
  },
});
