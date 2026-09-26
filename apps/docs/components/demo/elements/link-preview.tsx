"use client";

import { LinkPreview } from "@/components/assistant-ui/elements/link-preview";

export function LinkPreviewDemo() {
  return (
    <LinkPreview
      href="https://github.com/langchain-ai/open-canvas"
      title="Open Canvas"
      description="OSS implementation of ChatGPT's Canvas."
      image="/screenshot/open-canvas.png"
      imageAlt="Open Canvas editing a document beside its chat"
      siteName="GitHub"
    />
  );
}

export function LinkPreviewCompactDemo() {
  return (
    <LinkPreview
      href="https://www.assistant-ui.com/examples/ai-sdk"
      title="AI SDK"
      description="Chat persistence with AI SDK."
      image="/screenshot/examples/ai-sdk.png"
      imageAlt="The AI SDK example chat"
      siteName="assistant-ui"
      favicon="/favicon/icon.svg"
      layout="compact"
    />
  );
}
