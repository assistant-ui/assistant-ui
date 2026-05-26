"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useAui,
  useAuiState,
  AuiProvider,
  Suggestions,
  Artifacts,
  ArtifactPrimitive,
  defaultArtifactTypes,
  defaultArtifactPatches,
} from "@assistant-ui/react";
import {
  reactArtifactType,
  claudeParityImportMap,
} from "@assistant-ui/react-artifact-runtime";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import {
  CodeIcon,
  EyeIcon,
  XIcon,
  LayoutGridIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckIcon,
  FileCodeIcon,
  PencilIcon,
  ReplaceIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Side panel state (open/close + selection)
// ---------------------------------------------------------------------------

type PanelCtx = {
  isOpen: boolean;
  open: (id?: string) => void;
  close: () => void;
};
const PanelContext = createContext<PanelCtx | null>(null);
const usePanel = () => {
  const v = useContext(PanelContext);
  if (!v) throw new Error("usePanel must be used within PanelProvider");
  return v;
};

const PanelProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const aui = useAui();
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open the panel when a new artifact is created (count goes up).
  // Updates to existing artifacts don't trigger a reopen, so the user can
  // close the panel mid-conversation without it popping back open on every
  // patch operation.
  const count = useAuiState((s) => s.artifacts.count);
  const lastCountRef = useRef(0);
  useEffect(() => {
    if (count > lastCountRef.current) setIsOpen(true);
    lastCountRef.current = count;
  }, [count]);

  const value: PanelCtx = {
    isOpen,
    open: (id) => {
      setIsOpen(true);
      if (id) aui.artifacts().select(id);
    },
    close: () => setIsOpen(false),
  };
  return (
    <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Inline artifact card (replaces the tool-call pill)
// ---------------------------------------------------------------------------

const cardMeta = {
  render_html: { verb: "Created", lang: "HTML", icon: FileCodeIcon },
  render_react: { verb: "Created", lang: "React", icon: FileCodeIcon },
  update_artifact: { verb: "Updated", lang: null, icon: PencilIcon },
  rewrite_artifact: { verb: "Rewrote", lang: null, icon: ReplaceIcon },
} as const;

type CardToolName = keyof typeof cardMeta;

type ArtifactCardProps = {
  toolCallId: string;
  toolName: CardToolName;
  args: { artifactId?: string };
};

const ArtifactCard: FC<ArtifactCardProps> = ({
  toolCallId,
  toolName,
  args,
}) => {
  const aui = useAui();
  const { open, isOpen } = usePanel();
  const artifactId = args.artifactId;

  // Read this op's status from the artifact operations list (fold result).
  const opStatus = useAuiState((s) => {
    for (const a of s.artifacts.artifacts) {
      for (const op of a.operations) {
        if (op.toolCallId === toolCallId) return op.result;
      }
    }
    return null;
  });

  // Also subscribe to the resource's external status map (for fold-time
  // errors that never make it into an artifact's operations — e.g.
  // update_artifact targeting an unknown id).
  const [externalStatus, setExternalStatus] = useState(() =>
    aui.artifacts().getOperationStatus(toolCallId),
  );
  useEffect(() => {
    return aui.subscribe(() => {
      setExternalStatus(aui.artifacts().getOperationStatus(toolCallId));
    });
  }, [aui, toolCallId]);

  const status = opStatus ?? externalStatus;
  const selectedId = useAuiState((s) => s.artifacts.selectedId);
  const isSelected = !!artifactId && selectedId === artifactId && isOpen;

  // The card is a read-only status indicator. Tool-call completion (the
  // addResult that drives the model's auto-continue loop) is owned by the
  // Artifacts resource, which submits the result once an operation reaches a
  // terminal status — independent of whether this card is mounted.

  const meta = cardMeta[toolName];
  const Icon = meta.icon;
  const statusIcon =
    !status || status.status === "pending" ? (
      <Loader2Icon className="size-4 animate-spin text-amber-500" />
    ) : status.status === "ok" ? (
      <CheckIcon className="size-4 text-emerald-500" />
    ) : (
      <AlertCircleIcon className="size-4 text-rose-500" />
    );

  return (
    <button
      type="button"
      onClick={() => artifactId && open(artifactId)}
      className={`my-2 flex w-full max-w-md items-start gap-3 rounded-xl border bg-card p-3 text-left text-sm shadow-sm transition hover:bg-muted/40 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {meta.verb}
            {meta.lang ? ` ${meta.lang}` : ""} artifact
          </span>
          {statusIcon}
        </div>
        <div className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
          {artifactId ?? "(no id)"}
        </div>
        {status?.status === "error" && (
          <div className="mt-1 line-clamp-2 text-rose-600 text-xs">
            {status.error.message}
          </div>
        )}
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Toolkit (render-only entries; tool-call completion is owned by the
// Artifacts resource, not these cards)
// ---------------------------------------------------------------------------

const cardRender = (toolName: CardToolName) =>
  function CardRender(props: {
    toolCallId: string;
    args: { artifactId?: string };
  }) {
    return (
      <ArtifactCard
        toolCallId={props.toolCallId}
        toolName={toolName}
        args={props.args}
      />
    );
  };

const artifactsToolkit = {
  render_html: {
    type: "human" as const,
    description: "Create a new HTML artifact.",
    parameters: z.object({
      artifactId: z.string(),
      code: z.string(),
    }),
    render: cardRender("render_html") as any,
  },
  render_react: {
    type: "human" as const,
    description: "Create a new React artifact.",
    parameters: z.object({
      artifactId: z.string(),
      code: z.string(),
    }),
    render: cardRender("render_react") as any,
  },
  update_artifact: {
    type: "human" as const,
    description:
      "Surgically edit an existing artifact by replacing one exact substring.",
    parameters: z.object({
      artifactId: z.string(),
      find: z.string(),
      replace: z.string(),
    }),
    render: cardRender("update_artifact") as any,
  },
  rewrite_artifact: {
    type: "human" as const,
    description: "Replace the entire content of an existing artifact.",
    parameters: z.object({
      artifactId: z.string(),
      code: z.string(),
    }),
    render: cardRender("rewrite_artifact") as any,
  },
};

const artifactTypes = [
  ...defaultArtifactTypes,
  reactArtifactType({ importMap: claudeParityImportMap }),
];

// ---------------------------------------------------------------------------
// Side panel (collapsible, multi-artifact selector, source/preview tabs)
// ---------------------------------------------------------------------------

const ArtifactsPanel: FC = () => {
  const { isOpen, close } = usePanel();
  const aui = useAui();
  const artifacts = useAuiState((s) => s.artifacts.artifacts);
  const selectedId = useAuiState((s) => s.artifacts.selectedId);
  const [tab, setTab] = useState<"source" | "preview">("preview");

  // Draggable width. The handle sits on the LEFT edge of the panel; dragging
  // it left grows the panel, dragging right shrinks it.
  const [width, setWidth] = useState(640);
  const draggingRef = useRef(false);
  const onResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    // Disable text selection + iframe pointer-events globally while dragging.
    document.body.style.userSelect = "none";
  };
  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const next = Math.max(
      320,
      Math.min(window.innerWidth - 240, window.innerWidth - e.clientX),
    );
    setWidth(next);
  };
  const onResizePointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.userSelect = "";
  };

  if (!isOpen || artifacts.length === 0) return null;
  return (
    <div className="relative flex shrink-0 flex-col p-3" style={{ width }}>
      <button
        type="button"
        aria-label="Resize artifacts panel"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        className="absolute top-0 bottom-0 left-0 z-20 w-2 -translate-x-1/2 cursor-col-resize border-0 bg-transparent p-0 hover:bg-primary/30"
      />
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <LayoutGridIcon className="size-4 shrink-0 text-muted-foreground" />
            <select
              value={selectedId ?? ""}
              onChange={(e) => aui.artifacts().select(e.target.value)}
              className="min-w-0 rounded-md border bg-background px-2 py-1 font-mono text-sm"
            >
              {artifacts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id}
                  {a.operations.length > 1
                    ? ` (${a.operations.length} ops)`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ArtifactPrimitive.VersionPicker.Previous className="rounded p-1 hover:bg-muted disabled:opacity-30">
              ‹
            </ArtifactPrimitive.VersionPicker.Previous>
            <span className="font-mono text-muted-foreground text-xs">
              <ArtifactPrimitive.VersionPicker.Number /> /{" "}
              <ArtifactPrimitive.VersionPicker.Count />
            </span>
            <ArtifactPrimitive.VersionPicker.Next className="rounded p-1 hover:bg-muted disabled:opacity-30">
              ›
            </ArtifactPrimitive.VersionPicker.Next>
            <div className="mx-1 h-5 w-px bg-border" />
            <button
              type="button"
              aria-label="Close artifacts panel"
              onClick={close}
              className="rounded p-1 hover:bg-muted"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setTab("source")}
            className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
              tab === "source"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CodeIcon className="size-4" />
            Source Code
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
              tab === "preview"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <EyeIcon className="size-4" />
            Preview
          </button>
        </div>
        {/*
          Always mount BOTH Source and Preview, toggle via CSS only. The
          iframe must be live the moment an artifact is folded in so it can
          report mount status back over `aui:artifact:status` — without that,
          the tool result never lands, the card never flips out of pending,
          and the model thinks the artifact is still generating. CSS-hiding
          the inactive tab keeps the iframe alive while presenting the
          tabbed UX.
        */}
        <div className="relative min-h-0 flex-1">
          <ArtifactPrimitive.Source
            className={`absolute inset-0 overflow-y-auto whitespace-pre break-words px-4 py-2 font-mono text-sm ${
              tab === "source" ? "" : "pointer-events-none invisible"
            }`}
          />
          <ArtifactPrimitive.Preview
            className={`absolute inset-0 ${
              tab === "preview" ? "" : "pointer-events-none invisible"
            }`}
          />
        </div>
      </div>
    </div>
  );
};

// Floating pill: shown when the panel is closed but artifacts exist, so the
// user can reopen the panel.
const OpenPanelPill: FC = () => {
  const { isOpen, open } = usePanel();
  const count = useAuiState((s) => s.artifacts.count);
  if (isOpen || count === 0) return null;
  return (
    <button
      type="button"
      onClick={() => open()}
      className="fixed top-4 right-4 z-20 flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-muted/40"
    >
      <LayoutGridIcon className="size-4" />
      {count} artifact{count === 1 ? "" : "s"}
    </button>
  );
};

// ---------------------------------------------------------------------------
// App composition
// ---------------------------------------------------------------------------

function App() {
  const aui = useAui({
    artifacts: Artifacts({
      toolkit: artifactsToolkit,
      types: artifactTypes,
      patches: defaultArtifactPatches,
    }),
    suggestions: Suggestions([
      {
        title: "Simulate a double pendulum",
        label: "chaos theory in motion",
        prompt:
          "Render a React component that simulates a double pendulum using canvas. Show the chaotic motion of the two arms with a fading trail behind the second bob. Include sliders for the two initial angles and a reset button. Use Tailwind for styling.",
      },
      {
        title: "Visualize the solar system",
        label: "interactive orbital mechanics",
        prompt:
          "Render a React component that visualizes the inner solar system. Draw the Sun and the four inner planets on a canvas, each orbiting at its real relative speed and orbital radius (scaled). Add a speed slider and a play/pause toggle. Use Tailwind for the UI chrome and lucide-react icons.",
      },
      {
        title: "Explain how transformers work",
        label: "interactive attention visualization",
        prompt:
          "Render a React component that explains how a transformer's self-attention mechanism works. Show a small input sentence (5–7 tokens), an animated attention-weight matrix between tokens, and a control to step through layers. Use Tailwind and lucide-react.",
      },
    ]),
  });
  return (
    <AuiProvider value={aui}>
      <PanelProvider>
        <main className="relative flex h-full justify-stretch">
          <div className="min-w-0 flex-grow basis-full">
            <Thread />
          </div>
          <ArtifactsPanel />
          <OpenPanelPill />
        </main>
      </PanelProvider>
    </AuiProvider>
  );
}

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <App />
    </AssistantRuntimeProvider>
  );
}
