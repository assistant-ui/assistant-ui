"use client";

import { CloudRendererHost } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

export default function RendererPage() {
  return (
    <CloudRendererHost
      allowedOrigins={[
        "https://cloud.assistant-ui.com",
        ...(process.env.NODE_ENV === "development"
          ? ["http://localhost:3001"]
          : []),
      ]}
    >
      <Thread />
    </CloudRendererHost>
  );
}
