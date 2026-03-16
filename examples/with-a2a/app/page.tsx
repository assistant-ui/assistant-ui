"use client";

import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";
import {
  useA2ATask,
  useA2AArtifacts,
  useA2AAgentCard,
  type A2ATaskState,
  type A2APart,
} from "@assistant-ui/react-a2a";
import { Thread } from "@/components/assistant-ui/thread";

// === State Badge ===

const STATE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  submitted: {
    label: "Submitted",
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  working: {
    label: "Working",
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  completed: {
    label: "Completed",
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  failed: {
    label: "Failed",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  canceled: {
    label: "Canceled",
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-900/30",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  input_required: {
    label: "Input Required",
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  auth_required: {
    label: "Auth Required",
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
};

function StateBadge({ state }: { state: A2ATaskState }) {
  const config = STATE_CONFIG[state] ?? {
    label: state,
    color: "text-gray-600",
    bg: "bg-gray-100",
  };
  const isActive = state === "working" || state === "submitted";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-xs ${config.color} ${config.bg}`}
    >
      {isActive ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <span className="inline-flex size-1.5 rounded-full bg-current" />
      )}
      {config.label}
    </span>
  );
}

// === Task Status Bar ===

function TaskStatusBar() {
  const task = useA2ATask();

  if (!task) return null;

  const { state } = task.status;
  const isError = state === "failed" || state === "rejected";
  const errorText = isError ? task.status.message?.parts?.[0]?.text : undefined;

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2 text-sm">
      <StateBadge state={state} />
      <span className="text-muted-foreground">Task {task.id.slice(0, 8)}</span>
      {errorText && (
        <span className="ml-auto text-red-600 text-xs">{errorText}</span>
      )}
    </div>
  );
}

// === Artifact Part Renderer ===

function ArtifactPartView({ part }: { part: A2APart }) {
  if (part.text !== undefined) {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded border bg-background p-2 font-mono text-xs">
        {part.text}
      </pre>
    );
  }
  if (part.data !== undefined) {
    return (
      <div className="rounded border bg-background p-2">
        <div className="mb-1 font-medium text-muted-foreground text-xs">
          Data
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
          {JSON.stringify(part.data, null, 2)}
        </pre>
      </div>
    );
  }
  if (part.url !== undefined) {
    const isImage = part.mediaType?.startsWith("image/");
    if (isImage) {
      return (
        <img
          src={part.url}
          alt={part.filename ?? "image"}
          className="max-h-64 rounded border"
        />
      );
    }
    return (
      <a
        href={part.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded border bg-background p-2 text-sm hover:bg-muted"
      >
        <span>📄</span>
        <span>{part.filename ?? "Download"}</span>
        {part.mediaType && (
          <span className="text-muted-foreground text-xs">
            {part.mediaType}
          </span>
        )}
      </a>
    );
  }
  if (part.raw !== undefined) {
    const isImage = part.mediaType?.startsWith("image/");
    if (isImage) {
      return (
        <img
          src={`data:${part.mediaType};base64,${part.raw}`}
          alt={part.filename ?? "image"}
          className="max-h-64 rounded border"
        />
      );
    }
    const dataUri = `data:${part.mediaType ?? "application/octet-stream"};base64,${part.raw}`;
    return (
      <a
        href={dataUri}
        download={part.filename ?? "download"}
        className="inline-flex items-center gap-2 rounded border bg-background p-2 text-sm hover:bg-muted"
      >
        <span>📎</span>
        <span>{part.filename ?? "File"}</span>
        {part.mediaType && (
          <span className="text-muted-foreground text-xs">
            {part.mediaType}
          </span>
        )}
      </a>
    );
  }
  return null;
}

// === Artifact Panel ===

function ArtifactPanel() {
  const artifacts = useA2AArtifacts();

  if (artifacts.length === 0) return null;

  return (
    <div className="max-h-80 overflow-y-auto border-t px-4 py-3">
      <h3 className="mb-2 font-medium text-muted-foreground text-xs">
        Artifacts ({artifacts.length})
      </h3>
      <div className="space-y-2">
        {artifacts.map((artifact) => (
          <div
            key={artifact.artifactId}
            className="overflow-hidden rounded-md border bg-muted/30"
          >
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5">
              <span className="font-medium text-xs">
                {artifact.name ?? artifact.artifactId}
              </span>
              {artifact.description && (
                <span className="text-muted-foreground text-xs">
                  {artifact.description}
                </span>
              )}
            </div>
            <div className="space-y-2 p-3">
              {artifact.parts.map((part, i) => (
                <ArtifactPartView key={i} part={part} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Agent Card Banner ===

function AgentCardBanner() {
  const card = useA2AAgentCard();

  if (!card) return null;

  return (
    <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2">
      <div className="flex-1">
        <div className="font-medium text-sm">{card.name}</div>
        <div className="text-muted-foreground text-xs">{card.description}</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {card.skills.map((skill) => (
          <span
            key={skill.id}
            className="rounded-md bg-muted px-2 py-0.5 text-xs"
            title={skill.description}
          >
            {skill.name}
          </span>
        ))}
      </div>
      <div className="text-muted-foreground text-xs">
        v{card.version}
        {card.capabilities.streaming && " · Streaming"}
      </div>
    </div>
  );
}

// === Thread with Suggestions ===

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Chat",
        label: "say hello",
        prompt: "Hello! What can you do?",
      },
      {
        title: "Generate artifacts",
        label: "code + data + file",
        prompt: "/artifacts a fibonacci function in Python",
      },
      {
        title: "Multi-step",
        label: "input-required flow",
        prompt: "/multistep",
      },
      {
        title: "Failure demo",
        label: "test error handling",
        prompt: "/fail",
      },
      {
        title: "Slow task",
        label: "test cancellation",
        prompt: "/slow",
      },
    ]),
  });
  return (
    <AuiProvider value={aui}>
      <Thread />
    </AuiProvider>
  );
}

// === Main ===

export default function Home() {
  return (
    <main className="flex h-dvh flex-col">
      <AgentCardBanner />
      <TaskStatusBar />
      <div className="min-h-0 flex-1">
        <ThreadWithSuggestions />
      </div>
      <ArtifactPanel />
    </main>
  );
}
