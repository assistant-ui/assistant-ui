"use client";

import { AuiConfig, AuiProvider } from "@assistant-ui/react";
import { HarnessCloudThreadList } from "@assistant-ui/react-harness-sdk";
import { useSyncExternalStore } from "react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

const credential = async () => {
  const response = await fetch("/api/credential", { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  const { token } = (await response.json()) as { token: string };
  return token;
};

const ShareThread = () => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(window.location.href)}
    >
      {isCopied ? "Link copied" : "Share this chat"}
    </Button>
  );
};

const ConnectedAssistant = ({ threadId }: { threadId: string }) => {
  const config = AuiConfig({
    threads: HarnessCloudThreadList({
      url: "/api/chat",
      origin: process.env.NEXT_PUBLIC_ASSISTANT_HARNESS_URL!,
      workspaceId: process.env.NEXT_PUBLIC_ASSISTANT_WORKSPACE_ID!,
      credential,
      threadId,
      onThreadIdChange: (threadId) => {
        window.location.hash = threadId ?? crypto.randomUUID();
      },
    }),
  });
  return (
    <AuiProvider config={config}>
      <div className="flex h-dvh flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div>
            <h1 className="font-semibold">Shared chat</h1>
            <p className="text-muted-foreground text-sm">
              Open the same link in another browser to chat together.
            </p>
          </div>
          <ShareThread />
        </header>
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </div>
    </AuiProvider>
  );
};

export const Assistant = () => {
  const threadId = useSyncExternalStore(
    subscribeToHash,
    currentThreadId,
    () => null,
  );
  if (threadId === null)
    return (
      <p className="p-6" role="status">
        Connecting to your chat…
      </p>
    );
  return <ConnectedAssistant threadId={threadId} />;
};

const currentThreadId = () => window.location.hash.slice(1) || "main";

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
