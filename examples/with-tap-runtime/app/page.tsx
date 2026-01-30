"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useAuiState } from "@assistant-ui/react";

export default function Home() {
  const isEmpty = useAuiState((state) => state.threads.main.isEmpty);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="font-bold text-2xl">Tap-Native Runtime Example</h1>
        <p className="text-muted-foreground text-sm">
          Built with ExternalThread and InMemoryThreadList
        </p>
      </header>

      <main className="flex-1 overflow-hidden p-4">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 font-semibold text-xl">No messages yet</h2>
              <p className="text-muted-foreground text-sm">
                Use the controls below to add messages
              </p>
            </div>
          </div>
        ) : (
          <>
            <Thread />
            <div className="mx-auto mt-4 max-w-2xl space-y-2">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-2 font-semibold text-sm">
                  About This Example
                </h3>
                <ul className="space-y-1 text-muted-foreground text-sm">
                  <li>
                    • Uses{" "}
                    <code className="rounded bg-muted px-1">
                      ExternalThread
                    </code>{" "}
                    to display messages
                  </li>
                  <li>• Messages are stored in React state</li>
                  <li>• Fully reactive - updates automatically</li>
                  <li>• No backend needed - pure client-side</li>
                </ul>
              </div>

              <div className="text-center text-muted-foreground text-xs">
                This is a minimal implementation. Features like editing,
                branching, and attachments can be added.
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
