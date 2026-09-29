"use client";

import type { ReactNode } from "react";
import {
  AuiConfig,
  CloudRendererHost,
  ThreadPrimitive,
  Tools,
  unstable_Interactables,
} from "@assistant-ui/react";
import docsToolkit from "@/lib/docs-toolkit";
import usageToolkit from "@/lib/usage-toolkit";
import { RENDERER_ALLOWED_ORIGINS } from "@/lib/renderer";
import {
  AssistantMessage,
  UserMessage,
} from "@/components/pages/home/demo/messages";

export function RendererHost(): ReactNode {
  const config = AuiConfig({
    tools: Tools({ toolkit: { ...docsToolkit, ...usageToolkit } }),
    unstable_interactables: unstable_Interactables(),
  });

  return (
    <CloudRendererHost
      allowedOrigins={RENDERER_ALLOWED_ORIGINS}
      config={config}
    >
      <div
        className="flex flex-col gap-y-6 px-4 py-6"
        style={{ ["--thread-max-width" as string]: "44rem" }}
      >
        <ThreadPrimitive.Messages>
          {({ message }) => {
            if (message.role === "user") return <UserMessage />;
            if (message.role === "assistant") return <AssistantMessage />;
            return null;
          }}
        </ThreadPrimitive.Messages>
      </div>
    </CloudRendererHost>
  );
}
