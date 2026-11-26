"use client";

import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  ExportedMessageRepository,
  useAui,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { cn } from "@/lib/utils";
import { SampleScope } from "./sample-scope";

const REPLIES = [
  "Another take: start in Baixa and end at a miradouro at sunset.",
  "Or spend the second day by the sea in Cascais.",
  "Try a food walk in Mouraria, then fado in the evening.",
];

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

function createAdapter(): ChatModelAdapter {
  let count = 0;
  return {
    async *run({ abortSignal }) {
      const words = REPLIES[count++ % REPLIES.length]!.split(" ");
      for (let i = 1; i <= words.length; i++) {
        await wait(45, abortSignal);
        if (abortSignal.aborted) return;
        yield {
          content: [{ type: "text", text: words.slice(0, i).join(" ") }],
        };
      }
    },
  };
}

const CREATED_AT = new Date("2026-11-26T12:00:00Z");

const seed = (
  id: string,
  parentId: string | null,
  role: "user" | "assistant",
  content: string,
) => ({
  parentId,
  message: { id, role, content, createdAt: CREATED_AT },
});

const SEED = ExportedMessageRepository.fromBranchableArray(
  [
    seed("u1", null, "user", "Plan a weekend in Lisbon"),
    seed(
      "a1",
      "u1",
      "assistant",
      "Day 1: Alfama and the castle. Day 2: Belém by the river.",
    ),
    seed("u2", "a1", "user", "Make it cheaper"),
    seed(
      "a2",
      "u2",
      "assistant",
      "Walk instead of taking the tram, and eat at a tasca.",
    ),
    seed("u3", "a1", "user", "Make it three days"),
    seed("a3", "u3", "assistant", "Add a third day: take the train to Sintra."),
  ],
  { headId: "a3" },
);

const textOf = (message: ThreadMessage) =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

type Node = { message: ThreadMessage; children: Node[] };

function TreeNode({
  node,
  onPath,
  headId,
}: {
  node: Node;
  onPath: ReadonlySet<string>;
  headId: string | null | undefined;
}) {
  const { message } = node;
  const visible = onPath.has(message.id);
  const text = textOf(message) || "…";
  return (
    <li>
      <div
        className={cn(
          "flex items-start gap-1.5 py-0.5",
          visible ? "text-foreground" : "text-muted-foreground/70",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-1.5 shrink-0 rounded-full",
            message.id === headId
              ? "bg-blue-500"
              : visible
                ? "bg-foreground/60"
                : "bg-foreground/20",
          )}
        />
        <span className="min-w-0">
          <span className="font-mono">{message.role}</span>{" "}
          <span className="break-words">
            {text.length > 44 ? `${text.slice(0, 42)}…` : text}
          </span>
        </span>
      </div>
      {node.children.length > 0 && (
        <ul
          className={cn(
            "border-foreground/10 ml-[3px] border-l pl-3",
            node.children.length > 1 && "space-y-1",
          )}
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.message.id}
              node={child}
              onPath={onPath}
              headId={headId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function MessageTree() {
  const aui = useAui();
  // Re-read the repository whenever the visible messages change: a send, a stream chunk, an edit or a branch switch.
  const messages = useAuiState((s) => s.thread.messages);
  const repository = useMemo<ExportedMessageRepository>(
    // The placeholder thread mounted before the history loads has no messages and cannot export.
    () => (messages.length === 0 ? { messages: [] } : aui.thread().export()),
    [aui, messages],
  );

  const { roots, onPath, count } = useMemo(() => {
    const nodes = new Map<string, Node>();
    for (const { message } of repository.messages)
      nodes.set(message.id, { message, children: [] });
    const roots: Node[] = [];
    const parents = new Map<string, string | null>();
    for (const { message, parentId } of repository.messages) {
      parents.set(message.id, parentId);
      const node = nodes.get(message.id)!;
      const parent = parentId ? nodes.get(parentId) : undefined;
      (parent ? parent.children : roots).push(node);
    }
    const onPath = new Set<string>();
    let id = repository.headId ?? null;
    while (id) {
      onPath.add(id);
      id = parents.get(id) ?? null;
    }
    return { roots, onPath, count: repository.messages.length };
  }, [repository]);

  return (
    <div className="text-xs">
      <div className="text-muted-foreground mb-2">
        <span className="font-mono">thread.export()</span>, {count} messages
      </div>
      <ul className="space-y-1">
        {roots.map((node) => (
          <TreeNode
            key={node.message.id}
            node={node}
            onPath={onPath}
            headId={repository.headId}
          />
        ))}
      </ul>
    </div>
  );
}

/** Loads the seeded tree the way a saved thread loads: through a history adapter. */
const history: ThreadHistoryAdapter = {
  async load() {
    return SEED;
  },
  async append() {},
};

function Sample() {
  const adapter = useMemo(createAdapter, []);
  const runtime = useLocalRuntime(adapter, { adapters: { history } });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid md:h-112 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="h-112 min-w-0">
          <Thread autoFocus={false} />
        </div>
        <aside
          aria-label="Message tree"
          className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] flex flex-col gap-3 border-t p-4 md:min-h-0 md:border-t-0 md:border-l"
        >
          <div>
            <div className="text-sm font-medium">Every branch is kept</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Edit a question or regenerate a reply. The new version becomes a
              sibling under the same parent, and the thread shows one path.
            </p>
          </div>
          <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
            <MessageTree />
          </div>
          <p className="text-muted-foreground mt-auto text-xs">
            Faded rows are branches the thread is not showing. The blue dot
            marks the head.
          </p>
        </aside>
      </div>
    </AssistantRuntimeProvider>
  );
}

/** A real Thread on a local runtime with a canned model; the panel draws the message repository from `thread.export()`. */
export function BranchTreeSample() {
  return (
    <div className="not-prose border-foreground/10 rounded-document my-6 overflow-hidden border">
      <SampleScope>
        <Sample />
      </SampleScope>
    </div>
  );
}
