"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  unstable_useInteractable,
  unstable_useInteractableVersions,
  useAuiState,
  type Unstable_InteractableToolRenderProps,
} from "@assistant-ui/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  Code2Icon,
  EyeIcon,
  FileCode2Icon,
  HistoryIcon,
  Loader2Icon,
  PanelRightOpenIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import {
  artifactDescription,
  artifactSchema,
  emptyArtifact,
  type ArtifactState,
} from "./artifact-state";

type ArtifactSurfaceTarget = {
  id: string;
  name: "artifact";
  messageId: string;
};

type ArtifactSurfaceContextValue = {
  active: ArtifactSurfaceTarget | null;
  open: (target: ArtifactSurfaceTarget) => void;
  close: () => void;
  returnToOrigin: () => void;
};

const ArtifactSurfaceContext =
  createContext<ArtifactSurfaceContextValue | null>(null);

export function ArtifactSurfaceProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ArtifactSurfaceTarget | null>(null);

  const value = useMemo<ArtifactSurfaceContextValue>(
    () => ({
      active,
      open: setActive,
      close: () => setActive(null),
      returnToOrigin: () => {
        const messageId = active?.messageId;
        setActive(null);
        if (!messageId) return;
        requestAnimationFrame(() => {
          const message = Array.from(
            document.querySelectorAll<HTMLElement>("[data-message-id]"),
          ).find((element) => element.dataset.messageId === messageId);
          message?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      },
    }),
    [active],
  );

  return (
    <ArtifactSurfaceContext.Provider value={value}>
      {children}
    </ArtifactSurfaceContext.Provider>
  );
}

export function useArtifactSurface() {
  const value = useContext(ArtifactSurfaceContext);
  if (!value) {
    throw new Error(
      "useArtifactSurface must be used within ArtifactSurfaceProvider",
    );
  }
  return value;
}

export function ArtifactTrigger({
  state,
  version,
  id,
  streaming,
}: Unstable_InteractableToolRenderProps<ArtifactState>) {
  const messageId = useAuiState((s) => s.message.id);
  const { active, open } = useArtifactSurface();
  const displayState = version?.state ?? state;
  const title = displayState.title || "Untitled artifact";
  const lineCount = displayState.code?.split("\n").length ?? 0;
  const isOpen = active?.id === id;

  return (
    <div className="my-3 overflow-hidden rounded-xl border bg-white shadow-[0_10px_30px_-22px_rgba(24,24,27,0.5)]">
      <div className="flex items-center gap-2 border-b bg-zinc-50 px-3 py-2 font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
        <FileCode2Icon className="size-3.5" />
        HTML artifact
        {streaming ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-amber-700">
            <Loader2Icon className="size-3 animate-spin" />
            Writing
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1.5 text-emerald-700">
            <CheckIcon className="size-3" />
            Ready
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {lineCount > 0 ? `${lineCount} lines` : "Preparing document"}
            {version && !version.isLatest ? " · historical version" : ""}
          </p>
        </div>
        <button
          type="button"
          data-testid="artifact-trigger"
          disabled={streaming}
          onClick={() =>
            open({
              id,
              name: "artifact",
              messageId,
            })
          }
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-zinc-950 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50"
        >
          <PanelRightOpenIcon className="size-3.5" />
          {isOpen ? "In workbench" : "Open workbench"}
        </button>
      </div>
    </div>
  );
}

export function ArtifactSurface() {
  const { active } = useArtifactSurface();
  if (!active) return null;
  return <ArtifactWorkbench key={active.id} target={active} />;
}

function ArtifactWorkbench({ target }: { target: ArtifactSurfaceTarget }) {
  const [state, { setState }] = unstable_useInteractable("artifact", {
    id: target.id,
    description: artifactDescription,
    stateSchema: artifactSchema,
    initialState: emptyArtifact,
  });
  const versions = unstable_useInteractableVersions<ArtifactState>(
    target.id,
    target.name,
  );
  const { close, returnToOrigin } = useArtifactSurface();
  const [view, setView] = useState<"preview" | "code">("preview");

  return (
    <aside
      data-testid="artifact-surface"
      className="fixed inset-0 z-30 flex min-w-0 flex-1 flex-col bg-[#f4f2ed] md:static md:z-0 md:border-l"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-900/10 bg-[#f8f7f3]/90 px-3 backdrop-blur md:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-300 text-zinc-950 shadow-[inset_0_0_0_1px_rgba(24,24,27,0.12)]">
            <SparklesIcon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {state.title || "Untitled artifact"}
            </p>
            <p className="font-mono text-[9px] tracking-[0.14em] text-zinc-500 uppercase">
              Opened from conversation
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <label className="relative hidden sm:block">
            <span className="sr-only">Artifact version history</span>
            <HistoryIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
            <select
              data-testid="artifact-version-select"
              aria-label="Artifact version history"
              value=""
              onChange={(event) => {
                const version = versions[Number(event.target.value)];
                version?.restore();
              }}
              className="h-8 appearance-none rounded-md border border-zinc-900/10 bg-white pr-2 pl-8 text-xs text-zinc-700 outline-none hover:bg-zinc-50"
            >
              <option value="" disabled>
                {versions.length}{" "}
                {versions.length === 1 ? "version" : "versions"}
              </option>
              {versions.map((version, index) => (
                <option key={`${version.origin}-${index}`} value={index}>
                  v{index + 1} ·{" "}
                  {version.origin === "user-edit" ? "you" : "assistant"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            data-testid="artifact-return"
            aria-label="Return to conversation"
            onClick={returnToOrigin}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-900/10 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span className="hidden sm:inline">Conversation</span>
          </button>
          <button
            type="button"
            data-testid="artifact-close"
            onClick={close}
            className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-950"
            aria-label="Close artifact"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-2 md:p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-[0_24px_70px_-44px_rgba(24,24,27,0.55)]">
          <div className="flex shrink-0 items-center gap-1 border-b bg-zinc-50/80 p-1.5">
            <button
              type="button"
              onClick={() => setView("preview")}
              className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
                view === "preview"
                  ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-900/8"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              <EyeIcon className="size-3.5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setView("code")}
              className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
                view === "code"
                  ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-900/8"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              <Code2Icon className="size-3.5" />
              Source
            </button>
            <span className="ml-auto pr-2 font-mono text-[9px] tracking-[0.14em] text-zinc-400 uppercase">
              Live document
            </span>
          </div>

          {view === "preview" ? (
            <iframe
              data-testid="artifact-preview"
              title={`Preview of ${state.title || "artifact"}`}
              srcDoc={state.code}
              sandbox="allow-scripts"
              className="min-h-0 flex-1 bg-white"
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <input
                aria-label="Artifact title"
                value={state.title}
                onChange={(event) =>
                  setState((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                className="h-11 shrink-0 border-b px-4 text-sm font-semibold outline-none placeholder:text-zinc-400"
                placeholder="Artifact title"
              />
              <textarea
                data-testid="artifact-code-editor"
                aria-label="Artifact HTML source"
                value={state.code}
                onChange={(event) =>
                  setState((previous) => ({
                    ...previous,
                    code: event.target.value,
                  }))
                }
                spellCheck={false}
                className="min-h-0 flex-1 resize-none bg-zinc-950 p-4 font-mono text-[13px] leading-6 text-zinc-100 outline-none selection:bg-amber-300 selection:text-zinc-950"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
