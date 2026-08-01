"use client";

import { AuiProvider, Tools, useAui } from "@assistant-ui/react";
import type { ComponentType, ReactNode } from "react";
import toolkitS4 from "./stages/S4/project/app/toolkit";
import { Thread as ThreadS1 } from "./stages/S1/project/components/assistant-ui/thread";
import { Thread as ThreadS2 } from "./stages/S2/project/components/assistant-ui/thread";
import { Thread as ThreadS3 } from "./stages/S3/project/components/assistant-ui/thread";
import { Thread as ThreadS4 } from "./stages/S4/project/components/assistant-ui/thread";
import toolkitS5 from "./stages/S5/project/app/toolkit";
import { Thread as ThreadS5 } from "./stages/S5/project/components/assistant-ui/thread";
import { Thread as ThreadS6 } from "./stages/S6/project/components/assistant-ui/thread";
import {
  ThreadList,
  ThreadListNew,
} from "./stages/S6/project/components/assistant-ui/thread-list";
import { Thread as ThreadS7 } from "./stages/S7/project/components/assistant-ui/thread";

function ThreadPage({ Thread }: { Thread: ComponentType }) {
  return (
    <main className="h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Thread />
    </main>
  );
}

function S4ToolProvider({ children }: { children: ReactNode }) {
  const aui = useAui({ tools: Tools({ toolkit: toolkitS4 }) });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
}

function S5ToolProvider({ children }: { children: ReactNode }) {
  const aui = useAui({ tools: Tools({ toolkit: toolkitS5 }) });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
}

function ToolThreadPage({
  Thread,
  ToolProvider,
}: {
  Thread: ComponentType;
  ToolProvider: ComponentType<{ children: ReactNode }>;
}) {
  return (
    <ToolProvider>
      <ThreadPage Thread={Thread} />
    </ToolProvider>
  );
}

function PersistentThreadPage({ Thread }: { Thread: ComponentType }) {
  return (
    <S5ToolProvider>
      <main className="flex h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--muted)]/30 p-3 md:block">
          <p className="px-2 py-3 text-sm font-semibold">Conversations</p>
          <ThreadList />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-[var(--border)] p-2 md:hidden">
            <ThreadListNew />
          </div>
          <div className="min-h-0 flex-1">
            <Thread />
          </div>
        </section>
      </main>
    </S5ToolProvider>
  );
}

export function S1Page() {
  return <ThreadPage Thread={ThreadS1} />;
}

export function S2Page() {
  return <ThreadPage Thread={ThreadS2} />;
}

export function S3Page() {
  return <ThreadPage Thread={ThreadS3} />;
}

export function S4Page() {
  return <ToolThreadPage Thread={ThreadS4} ToolProvider={S4ToolProvider} />;
}

export function S5Page() {
  return <ToolThreadPage Thread={ThreadS5} ToolProvider={S5ToolProvider} />;
}

export function S6Page() {
  return <PersistentThreadPage Thread={ThreadS6} />;
}

export function S7Page() {
  return <PersistentThreadPage Thread={ThreadS7} />;
}
