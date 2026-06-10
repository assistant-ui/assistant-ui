"use client";

import { useEffect, useState } from "react";
import { Thread } from "../components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import type { PiModelOption } from "../components/pi-handshake";
import { usePiThreadState } from "@assistant-ui/react-pi";
import type { PiRuntimeReadiness } from "@assistant-ui/react-pi";
import { PiHandshakeProvider } from "../components/pi-handshake";
import { PiRuntimeProvider } from "./PiRuntimeProvider";
import { WorkspaceBrowser } from "../components/workspace-browser";

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
  workspacePath,
  onCommitWorkspace,
}: {
  workspacePath: string;
  onCommitWorkspace: (value: string) => void;
}) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <span className="font-semibold">assistant-ui × Pi</span>

      <div className="ml-auto flex items-center gap-2">
        <WorkspaceBrowser value={workspacePath} onCommit={onCommitWorkspace} />
      </div>
    </header>
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
