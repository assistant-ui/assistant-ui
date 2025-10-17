"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Shiki-based JSON syntax highlighting for the Raw view
import {
  useShikiHighlighter,
  createHighlighterCore,
  createJavaScriptRegexEngine,
} from "react-shiki/core";
// Infer the core highlighter type from the factory so we don't need a direct shiki/core type dep
type ShikiCore = Awaited<ReturnType<typeof createHighlighterCore>>;
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  normalizeToolList,
  type NormalizedTool,
  FrameClient,
} from "@assistant-ui/react-devtools";

interface AssistantState {
  [key: string]: unknown;
}

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

interface ModelContext {
  system?: string;
  tools?: NormalizedTool[];
  callSettings?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface ApiInfo {
  id: number;
  state: AssistantState;
  logs: EventLog[];
  modelContext?: ModelContext;
}

interface ApiData {
  apiId: number;
  state: any;
  events: any[];
  modelContext?: any;
}

type TabType = "state" | "events" | "modelContext";

const formatTime = (value: Date) =>
  `${value.getHours().toString().padStart(2, "0")}:${value
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${value.getSeconds().toString().padStart(2, "0")}`;

// Extract model context from state for backward compatibility
const extractModelContext = (state: any): ModelContext | undefined => {
  if (!isRecord(state)) return undefined;

  const threadScope = state.thread;
  if (!isRecord(threadScope)) return undefined;

  const runtime = threadScope?.runtime;
  if (!isRecord(runtime)) return undefined;

  const modelContext = runtime.modelContext;
  if (!isRecord(modelContext)) return undefined;

  return {
    system:
      typeof modelContext.system === "string" ? modelContext.system : undefined,
    tools: normalizeToolList(modelContext.tools),
    callSettings: isRecord(modelContext.callSettings)
      ? modelContext.callSettings
      : undefined,
    config: isRecord(modelContext.config) ? modelContext.config : undefined,
  };
};

const ControlButton = ({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={clsx(
      "inline-flex h-7 items-center rounded-md border border-zinc-300 px-2.5 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-900",
      className,
    )}
    {...props}
  />
);

const JSONPreview = ({ value }: { value: unknown }) => (
  <pre className="whitespace-pre-wrap break-words rounded-lg bg-zinc-100 p-3 text-[11px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
    {JSON.stringify(value, null, 2)}
  </pre>
);

// Lazily create and cache a minimal Shiki highlighter that only knows JSON and a couple themes
// We use the JavaScript regex engine for smaller client bundle; set forgiving for broad grammar support
const getJsonHighlighter = (() => {
  let cached: ShikiCore | null = null;
  let pending: Promise<ShikiCore> | null = null;
  return async (): Promise<ShikiCore> => {
    if (cached) return cached;
    if (!pending) {
      pending = createHighlighterCore({
        themes: [
          import("@shikijs/themes/catppuccin-mocha"),
          import("@shikijs/themes/catppuccin-latte"),
        ],
        langs: [import("@shikijs/langs/json")],
        engine: createJavaScriptRegexEngine({ forgiving: true }),
      }).then((h: ShikiCore) => {
        cached = h;
        return h;
      });
    }
    return pending;
  };
})();

// Inner component that assumes highlighter is defined – safe to call the hook here
const JSONRawHighlightedInner = ({
  code,
  highlighter,
}: {
  code: string;
  highlighter: ShikiCore;
}) => {
  console.log("highlighter-called");
  const highlighted = useShikiHighlighter(
    code,
    "json",
    { light: "catppuccin-latte", dark: "catppuccin-mocha" },
    { highlighter, defaultColor: "light-dark()" },
  );
  if (!highlighted) {
    return (
      <pre className="overflow-auto whitespace-pre rounded-lg bg-zinc-100 p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
        {code}
      </pre>
    );
  }
  return (
    <div className="[&_pre]:overflow-auto [&_pre]:whitespace-pre [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[11px] [&_pre]:leading-relaxed dark:[&_pre]:!bg-black/50">
      {highlighted}
    </div>
  );
};

// JSON syntax highlighted block for the Raw view (falls back to plain <pre> until ready)
const JSONRawHighlighted = ({ value }: { value: unknown }) => {
  const [highlighter, setHighlighter] = useState<ShikiCore | null>(null);
  useEffect(() => {
    let mounted = true;
    getJsonHighlighter().then((h: ShikiCore) => {
      if (mounted) setHighlighter(h);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const code = useMemo(() => JSON.stringify(value, null, 2) ?? "", [value]);

  if (!highlighter) {
    return (
      <pre className="overflow-auto whitespace-pre rounded-lg bg-zinc-100 p-3 text-[11px] text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
        {code}
      </pre>
    );
  }

  return <JSONRawHighlightedInner code={code} highlighter={highlighter} />;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const formatBoolean = (value: boolean | undefined) =>
  typeof value === "boolean" ? String(value) : undefined;

const formatDateTime = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const truncate = (value: string, max = 120) =>
  value.length > max ? `${value.slice(0, max)}...` : value;

interface ThreadListItemPreview {
  id: string;
  title?: string;
  status?: string;
  externalId?: string;
  remoteId?: string;
}

interface MessagePreview {
  id: string;
  role: string;
  createdAt?: string;
  summary: string;
  status?: string;
  attachments: string[];
}

interface SuggestionPreview {
  prompt?: string;
}

interface ComposerPreview {
  textLength: number;
  role?: string;
  attachments: number;
  isEditing?: boolean;
  canCancel?: boolean;
  isEmpty?: boolean;
  type?: string;
}

interface ThreadPreview {
  isDisabled?: boolean;
  isLoading?: boolean;
  isRunning?: boolean;
  messageCount: number;
  messages: MessagePreview[];
  suggestions: SuggestionPreview[];
  capabilities: string[];
  composer?: ComposerPreview;
}

interface ThreadListPreview {
  mainThreadId?: string;
  newThreadId?: string | null;
  isLoading?: boolean;
  threadIds: string[];
  archivedThreadIds: string[];
  threadItems: ThreadListItemPreview[];
  main?: ThreadPreview;
}

const ThreadDetails = ({
  thread,
  title,
}: {
  thread: ThreadPreview;
  title?: string;
}) => (
  <div className="flex flex-col gap-3">
    {title ? (
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </div>
    ) : null}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="Messages" value={String(thread.messageCount)} />
      {typeof thread.isLoading === "boolean" ? (
        <SummaryItem
          label="Loading"
          value={formatBoolean(thread.isLoading) ?? "—"}
        />
      ) : null}
      {typeof thread.isRunning === "boolean" ? (
        <SummaryItem
          label="Running"
          value={formatBoolean(thread.isRunning) ?? "—"}
        />
      ) : null}
      {thread.isDisabled !== undefined ? (
        <SummaryItem
          label="Disabled"
          value={formatBoolean(thread.isDisabled) ?? "—"}
        />
      ) : null}
    </div>

    {thread.capabilities.length ? (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Capabilities
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {thread.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    {thread.messages.length ? (
      <div className="rounded-md border border-zinc-200 bg-white text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
        <div className="border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Recent Messages
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {thread.messages
            .slice(-5)
            .reverse()
            .map((message) => (
              <div key={message.id} className="flex flex-col gap-1 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize text-zinc-800 dark:text-zinc-100">
                    {message.role}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(message.createdAt) ?? "—"}
                  </span>
                </div>
                {message.summary ? (
                  <div className="text-zinc-600 dark:text-zinc-300">
                    {message.summary}
                  </div>
                ) : (
                  <div className="text-zinc-500 dark:text-zinc-400">
                    No textual content
                  </div>
                )}
                {message.attachments.length ? (
                  <div className="flex flex-wrap gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {message.attachments.map((attachment, index) => (
                      <span
                        key={`${message.id}-attachment-${index}`}
                        className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {attachment}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.status ? (
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Status: {message.status}
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </div>
    ) : null}

    {thread.suggestions.length ? (
      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Suggestions
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {thread.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion.prompt || "(empty)"}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {thread.composer ? (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Composer
        </div>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="Role" value={thread.composer.role ?? "—"} />
          <SummaryItem
            label="Text Length"
            value={String(thread.composer.textLength)}
          />
          <SummaryItem
            label="Attachments"
            value={String(thread.composer.attachments)}
          />
          {typeof thread.composer.type === "string" ? (
            <SummaryItem label="Mode" value={thread.composer.type} />
          ) : null}
        </div>
        {(typeof thread.composer.isEditing === "boolean" ||
          typeof thread.composer.canCancel === "boolean" ||
          typeof thread.composer.isEmpty === "boolean") && (
          <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              State
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {typeof thread.composer.isEditing === "boolean" && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    thread.composer.isEditing
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  Editing: {thread.composer.isEditing ? "true" : "false"}
                </span>
              )}
              {typeof thread.composer.canCancel === "boolean" && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    thread.composer.canCancel
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  Cancelable: {thread.composer.canCancel ? "true" : "false"}
                </span>
              )}
              {typeof thread.composer.isEmpty === "boolean" && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    thread.composer.isEmpty
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  Empty: {thread.composer.isEmpty ? "true" : "false"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    ) : null}
  </div>
);

const extractMessageSummary = (content: unknown): string => {
  if (!Array.isArray(content)) return "";

  for (const part of content) {
    if (!isRecord(part)) continue;
    const type = typeof part.type === "string" ? part.type : undefined;

    if (
      (type === "text" || type === "reasoning") &&
      typeof part.text === "string"
    ) {
      const text = part.text.trim();
      if (text.length > 0) {
        return truncate(text, 160);
      }
    }

    if (type === "tool-call" && typeof part.toolName === "string") {
      return `Tool call: ${part.toolName}`;
    }

    if (type === "image" && typeof part.filename === "string") {
      return `Image: ${part.filename}`;
    }

    if (type === "file" && typeof part.filename === "string") {
      return `File: ${part.filename}`;
    }
  }

  const fallback = content.find((item) => typeof item === "string") as
    | string
    | undefined;
  if (fallback) {
    return truncate(fallback, 160);
  }

  return "";
};

const extractAttachmentNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((attachment) => {
      if (!isRecord(attachment)) return null;

      if (typeof attachment.name === "string" && attachment.name.length > 0) {
        return attachment.name;
      }

      if (
        typeof attachment.filename === "string" &&
        attachment.filename.length > 0
      ) {
        return attachment.filename;
      }

      if (typeof attachment.type === "string" && attachment.type.length > 0) {
        return attachment.type;
      }

      if (typeof attachment.id === "string" && attachment.id.length > 0) {
        return attachment.id;
      }

      return null;
    })
    .filter((name): name is string => Boolean(name));
};

const parseSuggestionPreview = (value: unknown): SuggestionPreview | null => {
  if (!isRecord(value)) return null;
  if (typeof value.prompt !== "string") return null;
  return { prompt: value.prompt };
};

const parseComposerPreview = (value: unknown): ComposerPreview | undefined => {
  if (!isRecord(value)) return undefined;

  const text = typeof value.text === "string" ? value.text : "";
  const attachments = Array.isArray(value.attachments)
    ? value.attachments.length
    : 0;

  return {
    textLength: text.length,
    role: typeof value.role === "string" ? value.role : undefined,
    attachments,
    isEditing:
      typeof value.isEditing === "boolean" ? value.isEditing : undefined,
    canCancel:
      typeof value.canCancel === "boolean" ? value.canCancel : undefined,
    isEmpty: typeof value.isEmpty === "boolean" ? value.isEmpty : undefined,
    type: typeof value.type === "string" ? value.type : undefined,
  };
};

const parseMessagePreview = (
  value: unknown,
  index: number,
): MessagePreview | null => {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : `message-${index}`;
  const role = typeof value.role === "string" ? value.role : "unknown";
  const summary = extractMessageSummary(value.content);

  return {
    id,
    role,
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : undefined,
    summary,
    status: typeof value.status === "string" ? value.status : undefined,
    attachments: extractAttachmentNames(value.attachments),
  };
};

const parseThreadListItemPreview = (
  value: unknown,
): ThreadListItemPreview | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;

  return {
    id: value.id,
    title: typeof value.title === "string" ? value.title : undefined,
    status: typeof value.status === "string" ? value.status : undefined,
    externalId:
      typeof value.externalId === "string" ? value.externalId : undefined,
    remoteId: typeof value.remoteId === "string" ? value.remoteId : undefined,
  };
};

const parseThreadPreview = (value: unknown): ThreadPreview | null => {
  if (!isRecord(value)) return null;

  const messages = Array.isArray(value.messages)
    ? value.messages
        .map((message, index) => parseMessagePreview(message, index))
        .filter((message): message is MessagePreview => Boolean(message))
    : [];

  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions
        .map((suggestion) => parseSuggestionPreview(suggestion))
        .filter((suggestion): suggestion is SuggestionPreview =>
          Boolean(suggestion),
        )
    : [];

  const capabilities = isRecord(value.capabilities)
    ? Object.entries(value.capabilities)
        .filter(([, flag]) => flag === true)
        .map(([name]) => name)
    : [];

  return {
    isDisabled:
      typeof value.isDisabled === "boolean" ? value.isDisabled : undefined,
    isLoading:
      typeof value.isLoading === "boolean" ? value.isLoading : undefined,
    isRunning:
      typeof value.isRunning === "boolean" ? value.isRunning : undefined,
    messageCount: messages.length,
    messages,
    suggestions,
    capabilities,
    composer: parseComposerPreview(value.composer),
  };
};

const parseThreadListPreview = (value: unknown): ThreadListPreview | null => {
  if (!isRecord(value)) return null;

  const threadItems = Array.isArray(value.threadItems)
    ? value.threadItems
        .map((item) => parseThreadListItemPreview(item))
        .filter((item): item is ThreadListItemPreview => Boolean(item))
    : [];

  return {
    mainThreadId:
      typeof value.mainThreadId === "string" ? value.mainThreadId : undefined,
    newThreadId:
      typeof value.newThreadId === "string"
        ? value.newThreadId
        : value.newThreadId === null
          ? null
          : undefined,
    isLoading:
      typeof value.isLoading === "boolean" ? value.isLoading : undefined,
    threadIds: isStringArray(value.threadIds),
    archivedThreadIds: isStringArray(value.archivedThreadIds),
    threadItems,
    main: parseThreadPreview(value.main) ?? undefined,
  };
};

const SummaryItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
    <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {label}
    </div>
    <div className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
      {value}
    </div>
  </div>
);

const renderToolUIsStatePreview = (value: unknown) => {
  if (!isRecord(value)) {
    return <JSONPreview value={value} />;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return (
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
        &lt;no tool UI mappings&gt;
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([toolName, components]) => {
        const list = Array.isArray(components) ? components : [];
        const firstEntry = typeof list[0] === "string" ? list[0] : undefined;

        return (
          <div
            key={toolName}
            className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 transition-colors dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                {toolName}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {list.length} component{list.length === 1 ? "" : "s"}
              </span>
            </div>
            {firstEntry ? (
              <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                First entry: {truncate(firstEntry, 80)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const renderThreadsStatePreview = (value: unknown) => {
  const state = parseThreadListPreview(value);
  if (!state) {
    return <JSONPreview value={value} />;
  }

  const activeCount = state.threadIds.length;
  const archivedCount = state.archivedThreadIds.length;
  const threadItems = state.threadItems.slice(0, 8);
  const main = state.main;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Main Thread" value={state.mainThreadId ?? "—"} />
        <SummaryItem label="New Thread" value={state.newThreadId ?? "—"} />
        <SummaryItem label="Active Threads" value={String(activeCount)} />
        <SummaryItem label="Archived Threads" value={String(archivedCount)} />
        {typeof state.isLoading === "boolean" ? (
          <SummaryItem
            label="Loading"
            value={formatBoolean(state.isLoading) ?? "—"}
          />
        ) : null}
        {main && typeof main.isRunning === "boolean" ? (
          <SummaryItem
            label="Main Running"
            value={formatBoolean(main.isRunning) ?? "—"}
          />
        ) : null}
      </div>

      {threadItems.length ? (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Thread Items ({state.threadItems.length})
          </div>
          <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-zinc-100 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Identifiers</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-zinc-700 dark:text-zinc-200">
                {threadItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-zinc-800 dark:text-zinc-100">
                        {item.title || "(untitled)"}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        ID: {item.id}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {item.status ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-[10px] text-zinc-500 dark:text-zinc-400">
                      {item.remoteId ? `Remote: ${item.remoteId}` : null}
                      {item.remoteId && item.externalId ? <br /> : null}
                      {item.externalId ? `External: ${item.externalId}` : null}
                      {!item.remoteId && !item.externalId ? "—" : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.threadItems.length > threadItems.length ? (
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Showing first {threadItems.length} items
            </div>
          ) : null}
        </div>
      ) : null}

      {main ? (
        <ThreadDetails thread={main} title="Main Thread Overview" />
      ) : null}
    </div>
  );
};

const renderThreadStatePreview = (value: unknown) => {
  const thread = parseThreadPreview(value);
  if (!thread) {
    return <JSONPreview value={value} />;
  }

  return <ThreadDetails thread={thread} title="Thread Overview" />;
};

const renderThreadListItemStatePreview = (value: unknown) => {
  const item = parseThreadListItemPreview(value);
  if (!item) {
    return <JSONPreview value={value} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="ID" value={item.id} />
        <SummaryItem label="Title" value={item.title ?? "(untitled)"} />
        <SummaryItem label="Status" value={item.status ?? "—"} />
        <SummaryItem label="Remote ID" value={item.remoteId ?? "—"} />
        <SummaryItem label="External ID" value={item.externalId ?? "—"} />
      </div>
      {item.title ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Title
          </div>
          <div className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
            {item.title}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const renderComposerStatePreview = (value: unknown) => {
  if (!isRecord(value)) {
    return <JSONPreview value={value} />;
  }

  const composer = parseComposerPreview(value);
  if (!composer) {
    return <JSONPreview value={value} />;
  }

  const text = typeof value.text === "string" ? value.text : "";
  const attachmentsDetail = Array.isArray(value.attachments)
    ? value.attachments
        .map((attachment) => {
          if (!isRecord(attachment)) return null;
          if (typeof attachment.name === "string" && attachment.name) {
            return attachment.name;
          }
          if (typeof attachment.filename === "string" && attachment.filename) {
            return attachment.filename;
          }
          if (typeof attachment.type === "string" && attachment.type) {
            return attachment.type;
          }
          return null;
        })
        .filter((name): name is string => Boolean(name))
    : [];

  const runConfig = value.runConfig;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Role" value={composer.role ?? "—"} />
        <SummaryItem label="Text Length" value={String(composer.textLength)} />
        <SummaryItem label="Attachments" value={String(composer.attachments)} />
        <SummaryItem label="Mode" value={composer.type ?? "—"} />
        <SummaryItem
          label="Editing"
          value={formatBoolean(composer.isEditing) ?? "—"}
        />
        <SummaryItem
          label="Can Cancel"
          value={formatBoolean(composer.canCancel) ?? "—"}
        />
        <SummaryItem
          label="Empty"
          value={formatBoolean(composer.isEmpty) ?? "—"}
        />
      </div>

      {text ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Text Preview
          </div>
          <div className="mt-1 whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-200">
            {truncate(text, 240)}
          </div>
        </div>
      ) : null}

      {attachmentsDetail.length ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Attachments
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {attachmentsDetail.map((attachment, index) => (
              <span
                key={`composer-attachment-${index}`}
                className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {attachment}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {runConfig !== undefined ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Run Config
          </div>
          <JSONPreview value={runConfig} />
        </div>
      ) : null}
    </div>
  );
};

const renderStatePreview = (key: string, value: unknown) => {
  switch (key) {
    case "threads":
      return renderThreadsStatePreview(value);
    case "threadListItems":
      return renderThreadsStatePreview({
        threadItems: value,
        threadIds: [],
        archivedThreadIds: [],
      });
    case "thread":
      return renderThreadStatePreview(value);
    case "threadListItem":
    case "threadlistitem":
      return renderThreadListItemStatePreview(value);
    case "toolUIs":
      return renderToolUIsStatePreview(value);
    case "composer":
      return renderComposerStatePreview(value);
    default:
      return <JSONPreview value={value} />;
  }
};

const CenteredMessage = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
    {children}
  </h3>
);

const InfoCard = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
    {children}
  </div>
);

export function DevToolsUI() {
  const [apis, setApis] = useState<ApiInfo[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("state");
  const [viewMode, setViewMode] = useState<"raw" | "preview">("preview");
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [unselectedEventTypes, setUnselectedEventTypes] = useState<Set<string>>(
    new Set(),
  );
  const knownEventTypesRef = useRef(new Set<string>());
  const frameClientRef = useRef<FrameClient | null>(null);
  // Warm the JSON highlighter early to avoid flicker on first Raw view open
  useEffect(() => {
    // Ignore result; just start the dynamic imports
    void getJsonHighlighter();
  }, []);
  const [isWindowFocused, setIsWindowFocused] = useState(() => {
    if (typeof document === "undefined") {
      return true;
    }
    return document.hasFocus();
  });
  const isWindowFocusedRef = useRef(isWindowFocused);
  const selectedApiIdRef = useRef<number | null>(null);

  useEffect(() => {
    isWindowFocusedRef.current = isWindowFocused;
  }, [isWindowFocused]);

  useEffect(() => {
    selectedApiIdRef.current = selectedApiId;
  }, [selectedApiId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    const handleVisibilityChange = () => {
      setIsWindowFocused(!document.hidden && document.hasFocus());
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    handleVisibilityChange();

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Initialize FrameClient and convert data to match old format
  useEffect(() => {
    const client = new FrameClient();
    frameClientRef.current = client;

    // Subscribe to updates
    const unsubscribe = client.subscribe((data) => {
      setSelectedApiId((id) => {
        const existingId = data.apis?.some((api) => api.apiId === id)
          ? id
          : null;
        return existingId ?? data.apis?.[0]?.apiId ?? null;
      });

      // Convert to old ApiInfo format for compatibility
      const convertedApis: ApiInfo[] =
        data.apis?.map((api: ApiData) => {
          const events = Array.isArray(api.events) ? api.events : [];
          return {
            id: api.apiId,
            state: api.state || {},
            logs: events.map((event: any) => ({
              time:
                typeof event.time === "string"
                  ? new Date(event.time)
                  : new Date(),
              event: typeof event.event === "string" ? event.event : "unknown",
              data: event.data,
            })),
            modelContext: api.modelContext || extractModelContext(api.state),
          };
        }) ?? [];
      setApis(convertedApis);
    });

    // Handle host reconnection (page refresh)
    const unsubscribeHostConnection = client.onHostConnected(() => {
      console.log("[DevToolsUI] Host reconnected, re-subscribing...");
      if (isWindowFocusedRef.current) {
        const currentSelectedApiId = selectedApiIdRef.current;
        client.setSubscription({
          apiList: true,
          apis: currentSelectedApiId !== null ? [currentSelectedApiId] : [],
        });
      } else {
        client.setSubscription({ apiList: true, apis: [] });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeHostConnection();
      client.setSubscription({ apiList: false, apis: [] });
      if (frameClientRef.current === client) {
        frameClientRef.current = null;
      }
    };
  }, []);

  // Manage subscription based on focus state and selected API
  useEffect(() => {
    const client = frameClientRef.current;
    if (!client) {
      return;
    }

    if (!isWindowFocused) {
      client.setSubscription({ apiList: true, apis: [] });
      return;
    }

    client.setSubscription({
      apiList: true,
      apis: selectedApiId !== null ? [selectedApiId] : [],
    });
  }, [isWindowFocused, selectedApiId]);

  const selectedApi = useMemo(
    () => apis.find((api) => api.id === selectedApiId) ?? apis[0] ?? null,
    [apis, selectedApiId],
  );

  useEffect(() => {
    if (!selectedApi && apis.length > 0) {
      setSelectedApiId(apis[0].id);
    }
  }, [apis, selectedApi]);

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    apis.forEach((api) => {
      api.logs.forEach((log) => types.add(log.event));
    });
    return Array.from(types).sort();
  }, [apis]);

  useEffect(() => {
    setUnselectedEventTypes((prev) => {
      const eventTypeSet = new Set(eventTypes);
      const next = new Set(prev);
      let changed = false;

      // Remove unselected event types that no longer exist
      Array.from(next).forEach((value) => {
        if (!eventTypeSet.has(value)) {
          next.delete(value);
          knownEventTypesRef.current.delete(value);
          changed = true;
        }
      });

      // Track known event types
      eventTypes.forEach((type) => {
        if (!knownEventTypesRef.current.has(type)) {
          knownEventTypesRef.current.add(type);
          // New event types are selected by default (not added to unselected)
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [eventTypes]);

  const filteredLogs = useMemo(() => {
    if (!selectedApi) return [];

    return selectedApi.logs.filter(
      (log) => !unselectedEventTypes.has(log.event),
    );
  }, [selectedApi, unselectedEventTypes]);

  const toggleStateSection = useCallback((key: string) => {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleEventType = useCallback((eventType: string) => {
    setUnselectedEventTypes((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  }, []);

  const clearEvents = useCallback(() => {
    if (frameClientRef.current && selectedApiId !== null) {
      frameClientRef.current.clearEvents(selectedApiId);
      // The update from FrameHost will handle clearing the UI
    }
  }, [selectedApiId]);

  const showApiSelector = apis.length > 1;

  const renderToolbar = () => {
    if (!showApiSelector) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-900 dark:bg-zinc-950">
        <span className="font-medium">API</span>
        <select
          value={selectedApiId ?? ""}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSelectedApiId(Number.isNaN(value) ? null : value);
          }}
          className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {apis.map((api) => (
            <option key={api.id} value={api.id}>
              API #{api.id}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderTabControls = () => {
    switch (activeTab) {
      case "events":
        return (
          <div className="flex h-full items-center gap-2 px-2">
            <ControlButton onClick={clearEvents}>Clear Events</ControlButton>
          </div>
        );
      case "state":
        return (
          <div className="flex h-full items-center gap-2 px-2">
            <ControlButton
              onClick={() =>
                setViewMode((prev) => (prev === "preview" ? "raw" : "preview"))
              }
            >
              {viewMode === "preview" ? "Raw" : "Preview"}
            </ControlButton>
          </div>
        );
      case "modelContext":
      default:
        return (
          <div className="flex h-full items-center px-4 text-xs text-zinc-500 dark:text-zinc-400">
            Model context overview
          </div>
        );
    }
  };

  const renderStateContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    if (Object.keys(selectedApi.state).length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No state detected for this assistant instance.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {Object.entries(selectedApi.state).map(([key, value]) => {
          const expanded = expandedStates.has(key);
          return (
            <div
              key={key}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                onClick={() => toggleStateSection(key)}
                className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <span>{key}</span>
                <span className="text-lg">{expanded ? "−" : "+"}</span>
              </button>
              {expanded && (
                <div className="border-t border-zinc-200 p-4 text-[11px] transition-colors dark:border-zinc-800">
                  {viewMode === "preview" ? (
                    renderStatePreview(key, value)
                  ) : (
                    // Raw JSON view with syntax highlighting
                    <JSONRawHighlighted value={value} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEventsContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    const eventFilterChips = eventTypes.map((eventType) => (
      <label
        key={eventType}
        className={clsx(
          "flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
          !unselectedEventTypes.has(eventType)
            ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-200"
            : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
        )}
      >
        <input
          type="checkbox"
          checked={!unselectedEventTypes.has(eventType)}
          onChange={() => toggleEventType(eventType)}
          className="size-3 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span>{eventType}</span>
      </label>
    ));

    return (
      <div className="flex h-full flex-col gap-3">
        {eventTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            {eventFilterChips}
          </div>
        )}
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              {eventTypes.length === 0
                ? "No events logged for this assistant instance."
                : "No events match the current filters."}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="bg-zinc-100 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="px-4 py-2 font-semibold">Time</th>
                  <th className="px-4 py-2 font-semibold">Event</th>
                  <th className="px-4 py-2 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr
                    key={`${log.event}-${index}`}
                    className="border-t border-zinc-200 bg-white text-[11px] transition-colors dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <td className="whitespace-nowrap px-4 py-2 align-top text-zinc-600 dark:text-zinc-300">
                      {formatTime(log.time)}
                    </td>
                    <td className="px-4 py-2 align-top font-semibold text-zinc-800 dark:text-zinc-100">
                      {log.event}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <JSONPreview value={log.data} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderContextContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    const toolList = normalizeToolList(selectedApi.modelContext?.tools);
    const hasSystem = selectedApi.modelContext?.system;
    const hasTools = toolList.length > 0;
    const hasCallSettings =
      selectedApi.modelContext?.callSettings &&
      Object.keys(selectedApi.modelContext.callSettings).length > 0;

    // Check if there's any context at all
    if (!hasSystem && !hasTools && !hasCallSettings) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            No model context configured for this assistant instance.
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {hasSystem && (
          <InfoCard>
            <SectionTitle>System Prompt</SectionTitle>
            <pre className="whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 text-[11px] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              {selectedApi.modelContext!.system}
            </pre>
          </InfoCard>
        )}
        {hasTools && (
          <InfoCard>
            <SectionTitle>Tools</SectionTitle>
            <div className="flex flex-col gap-3">
              {toolList.map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200"
                >
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-100">
                    <span>{tool.name}</span>
                    {tool.type ? (
                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {tool.type}
                      </span>
                    ) : null}
                    {tool.disabled ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        Disabled
                      </span>
                    ) : null}
                  </div>
                  {tool.description ? (
                    <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                      {tool.description}
                    </p>
                  ) : null}
                  {tool.parameters ? (
                    <div className="mt-2">
                      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Parameters
                      </div>
                      <JSONPreview value={tool.parameters} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </InfoCard>
        )}
        {hasCallSettings && (
          <InfoCard>
            <SectionTitle>Call Settings</SectionTitle>
            <JSONPreview value={selectedApi.modelContext!.callSettings} />
          </InfoCard>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "state":
        return renderStateContent();
      case "events":
        return renderEventsContent();
      case "modelContext":
      default:
        return renderContextContent();
    }
  };

  return (
    <div className="dark h-full w-full" data-theme="dark">
      <div className="flex h-full flex-col bg-white font-mono text-xs text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
        {renderToolbar()}

        <nav className="flex h-10 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-2 dark:border-zinc-900 dark:bg-zinc-950">
          <div className="flex h-full items-center gap-1">
            {["state", "modelContext", "events"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={clsx(
                  "flex h-full items-center px-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 transition-colors",
                  activeTab === tab
                    ? "border-b-2 border-blue-500 text-zinc-900 dark:border-blue-400 dark:text-zinc-100"
                    : "border-b-2 border-transparent hover:text-zinc-700 dark:hover:text-zinc-200",
                )}
              >
                {tab === "modelContext" ? "Model Context" : tab}
              </button>
            ))}
          </div>
          {renderTabControls()}
        </nav>

        <section className="flex-1 overflow-auto bg-white p-4 transition-colors dark:bg-zinc-950">
          {renderTabContent()}
        </section>

        <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] text-zinc-500 transition-colors dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-500">
          <span>
            Status:{" "}
            {apis.length > 0
              ? `${apis.length} assistant instance${apis.length > 1 ? "s" : ""} detected`
              : "Waiting for instances"}
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Connected
          </span>
        </footer>
      </div>
    </div>
  );
}
