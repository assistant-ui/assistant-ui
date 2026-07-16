"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  unstable_useInteractable,
  type Unstable_InteractableToolRenderProps,
} from "@assistant-ui/react";
import {
  artifactDescription,
  artifactSchema,
  emptyArtifact,
  type ArtifactState,
} from "./artifact-state";

const OpenArtifactContext = createContext<(id: string) => void>(() => {});

export function ArtifactSurfaceProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <OpenArtifactContext.Provider value={setActiveId}>
      <main className="flex h-full min-h-0">
        <section className="min-w-0 flex-1">{children}</section>
        {activeId && <ArtifactPanel key={activeId} id={activeId} />}
      </main>
    </OpenArtifactContext.Provider>
  );
}

export function ArtifactTrigger({
  state,
  id,
  streaming,
}: Unstable_InteractableToolRenderProps<ArtifactState>) {
  const open = useContext(OpenArtifactContext);

  return (
    <div className="my-3 flex items-center gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {state.title || "Untitled artifact"}
        </p>
        <p className="text-muted-foreground text-xs">
          {streaming ? "Creating artifact…" : "HTML artifact"}
        </p>
      </div>
      <button
        type="button"
        data-testid="artifact-trigger"
        disabled={streaming}
        onClick={() => open(id)}
        className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
      >
        Open
      </button>
    </div>
  );
}

function ArtifactPanel({ id }: { id: string }) {
  const [view, setView] = useState<"source" | "preview">("preview");
  const [state] = unstable_useInteractable("artifact", {
    id,
    description: artifactDescription,
    stateSchema: artifactSchema,
    initialState: emptyArtifact,
  });

  return (
    <aside
      data-testid="artifact-surface"
      className="flex min-w-0 flex-1 flex-col border-l"
    >
      <header className="flex h-12 items-center gap-3 border-b px-4">
        <h2 className="truncate text-sm font-medium">
          {state.title || "Untitled artifact"}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-pressed={view === "source"}
            onClick={() => setView("source")}
            className="aria-pressed:bg-muted rounded-md px-3 py-1.5 text-xs font-medium"
          >
            Source
          </button>
          <button
            type="button"
            aria-pressed={view === "preview"}
            onClick={() => setView("preview")}
            className="aria-pressed:bg-muted rounded-md px-3 py-1.5 text-xs font-medium"
          >
            Preview
          </button>
        </div>
      </header>
      {view === "source" ? (
        <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm whitespace-pre-wrap">
          {state.code}
        </pre>
      ) : (
        <iframe
          data-testid="artifact-preview"
          title={`Preview of ${state.title || "artifact"}`}
          srcDoc={state.code}
          sandbox="allow-scripts"
          className="min-h-0 flex-1 bg-white"
        />
      )}
    </aside>
  );
}
