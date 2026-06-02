"use client";

import { useEffect, useState } from "react";
import { Thread } from "../components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import type { PiModelOption } from "../components/pi-handshake";
import { usePiThreadState } from "@assistant-ui/react-pi";
import type { PiRuntimeReadiness } from "@assistant-ui/react-pi";
import { PiHandshakeProvider } from "../components/pi-handshake";
import { PiRuntimeProvider } from "./PiRuntimeProvider";

type Handshake = {
  workspacePath: string;
  models: PiModelOption[];
  selectedModelId?: string;
  readiness: PiRuntimeReadiness;
};

export default function Home() {
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [workspacePath, setWorkspacePath] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/pi/handshake")
      .then((response) => response.json())
      .then((data: Handshake) => {
        if (!active) return;
        setHandshake(data);
        setWorkspacePath(data.workspacePath ?? "");
      })
      .catch(() => {
        /* handshake is best-effort; the runtime still works on env defaults. */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PiRuntimeProvider workspacePath={workspacePath || undefined}>
      <PiHandshakeProvider value={handshake}>
        <div className="flex h-dvh flex-col overflow-hidden">
          <Header
            handshake={handshake}
            workspacePath={workspacePath}
            onCommitWorkspace={setWorkspacePath}
          />
          <ReadinessBanner fallback={handshake?.readiness} />
          <div className="flex min-h-0 flex-grow">
            <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r">
              <div className="flex-1 overflow-y-auto p-3">
                <ThreadList />
              </div>
            </aside>
            <main className="flex min-h-0 min-w-0 flex-grow flex-col overflow-hidden">
              <Thread />
            </main>
          </div>
        </div>
      </PiHandshakeProvider>
    </PiRuntimeProvider>
  );
}

function Header({
  handshake,
  workspacePath,
  onCommitWorkspace,
}: {
  handshake: Handshake | null;
  workspacePath: string;
  onCommitWorkspace: (value: string) => void;
}) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <span className="font-semibold">assistant-ui × Pi</span>

      <ModelStatus fallback={handshake?.readiness} />

      <div className="ml-auto flex items-center gap-2">
        <ContextUsageBadge />
        <label htmlFor="pi-workspace" className="text-muted-foreground text-xs">
          workspace
        </label>
        <WorkspaceField value={workspacePath} onCommit={onCommitWorkspace} />
      </div>
    </header>
  );
}

/** Commits on Enter or blur so the thread list doesn't re-scope per keystroke. */
function WorkspaceField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      id="pi-workspace"
      value={draft}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit(draft);
      }}
      className="border-input w-72 rounded-md border bg-transparent px-2 py-1 font-mono text-xs"
    />
  );
}

/** The env-seeded model + credential readiness, live once a thread loads. */
function ModelStatus({
  fallback,
}: {
  fallback?: PiRuntimeReadiness | undefined;
}) {
  const live = usePiThreadState((state) => state.readiness);
  const readiness = live ?? fallback;
  if (!readiness) return null;
  if (readiness.state === "ready") {
    return (
      <span className="text-muted-foreground text-xs">
        ● {readiness.selection.provider}/{readiness.selection.modelId} (
        {readiness.source})
      </span>
    );
  }
  return (
    <span className="text-destructive text-xs" title={readiness.message}>
      ⚠ {readiness.state}
    </span>
  );
}

function ContextUsageBadge() {
  const usage = usePiThreadState((state) => state.contextUsage);
  if (!usage || usage.percent == null) return null;
  return (
    <span className="text-muted-foreground text-xs">
      {Math.round(usage.percent)}% context
    </span>
  );
}

function ReadinessBanner({
  fallback,
}: {
  fallback?: PiRuntimeReadiness | undefined;
}) {
  const live = usePiThreadState((state) => state.readiness);
  const readiness = live ?? fallback;
  if (!readiness || readiness.state === "ready") return null;
  return (
    <div className="bg-destructive/10 text-destructive border-destructive/20 border-b px-4 py-2 text-sm">
      {readiness.message ?? "The Pi runtime has no usable model selected."}
    </div>
  );
}
