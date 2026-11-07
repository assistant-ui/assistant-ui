"use client";

import { LinkPreview } from "@/components/assistant-ui/elements/link-preview";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "no-image",
    label: "No image",
    note: "The page has no preview image, so the card shows text only.",
    Component: () => (
      <LinkPreview
        href="https://www.assistant-ui.com/docs/runtimes/custom/external-store"
        title="ExternalStoreRuntime"
        description="Bring your own state management for messages and threads."
        siteName="assistant-ui"
        favicon="/favicon/icon.svg"
      />
    ),
  },
  {
    key: "url-only",
    label: "URL only",
    note: "Nothing could be unfurled, so the host stands in for the title.",
    Component: () => (
      <LinkPreview href="https://docs.python.org/3/library/asyncio-task.html" />
    ),
  },
  {
    key: "compact-no-image",
    label: "Compact text",
    note: "The compact layout without an image keeps its row height.",
    Component: () => (
      <LinkPreview
        layout="compact"
        href="https://react.dev/reference/react/useSyncExternalStore"
        title="useSyncExternalStore"
        description="A React Hook that lets you subscribe to an external store."
        siteName="react.dev"
      />
    ),
  },
  {
    key: "long-content",
    label: "Long text",
    note: "A long title and description clamp to two lines each.",
    Component: () => (
      <LinkPreview
        href="https://github.com/langchain-ai/open-canvas"
        title="Open Canvas: an open source web application for collaborating with agents to better write documents, inspired by OpenAI's Canvas"
        description="Open Canvas lets you write documents and code side by side with an agent, keeps memory across sessions, starts from existing content, and supports custom quick actions and reflections that persist between conversations."
        image="/screenshot/open-canvas.png"
        imageAlt="Open Canvas editing a document beside its chat"
        siteName="GitHub"
      />
    ),
  },
]);
