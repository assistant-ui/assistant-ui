import {
  resource,
  tapState,
  tapCallback,
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
} from "@assistant-ui/tap";
import {
  tapAssistantClientRef,
  attachTransformScopes,
} from "@assistant-ui/store";
import type { ToolCallMessagePart } from "../../types/message";
import type { Toolkit } from "../../react/model-context/toolbox";
import type { Tool } from "assistant-stream";
import { Tools } from "../../react/client/Tools";
import { ModelContext } from "./model-context-client";
import type {
  Artifact,
  ArtifactOperation,
  ArtifactOperationStatus,
  ArtifactStatusError,
  ArtifactsMethods,
  ArtifactsState,
} from "../scopes/artifacts";

// Re-export the scope types so consumers can import them from this module.
export type {
  Artifact,
  ArtifactOperation,
  ArtifactOperationStatus,
  ArtifactStatusError,
  ArtifactsMethods,
  ArtifactsState,
};

/**
 * Pure mapping from an artifact operation status to the tool-result payload
 * submitted back to the model via `ThreadRuntime.addToolResult`. Returns
 * `null` for non-terminal (pending/absent) statuses, which must NOT produce a
 * result. Extracted as a pure helper so the mapping is unit-testable without
 * mounting the resource (which requires an AssistantTapContext).
 */
export const toolResultFromStatus = (
  status: ArtifactOperationStatus | null | undefined,
): {
  result: { ok: true } | { ok: false; error: string };
  isError: boolean;
} | null => {
  if (!status || status.status === "pending") return null;
  if (status.status === "error") {
    return {
      result: { ok: false, error: status.error.message },
      isError: true,
    };
  }
  return { result: { ok: true }, isError: false };
};

/**
 * Describes a tool call that CREATES a new artifact (or, when called again
 * with the same artifactId, replaces it entirely as a rewrite).
 */
export interface ArtifactSpec<TArgs = any> {
  toolName: string;
  mimeType: string;
  /** Pull the renderable content out of the tool-call args. */
  getContent: (args: TArgs) => string | undefined;
  /**
   * Optional: pull the artifact id out of the tool-call args. When omitted,
   * the create call's toolCallId is used as the id, which means the model
   * cannot address the artifact for later update / rewrite ops. To enable
   * iterative edits, accept an `artifactId` arg and return it here.
   */
  getArtifactId?: (args: TArgs) => string | undefined;
  /** Optional language hint for the source view. */
  language?: string;
  /**
   * Optional: transform raw content into a complete HTML document before SCF
   * rendering. When provided, the Preview primitive uses
   * `SafeContentFrame.renderHtml` rather than `renderRaw`. Use this for
   * artifact types that need a runtime scaffold (e.g. React via
   * `@assistant-ui/react-artifact-runtime`).
   */
  renderToHtml?: (content: string) => string | Promise<string>;
}

/**
 * Describes a tool call that MUTATES an existing artifact (update or
 * rewrite). Patch specs do not declare a mimeType — they inherit it from
 * the target artifact's create spec.
 */
export interface ArtifactPatchSpec<TArgs = any> {
  toolName: string;
  /** "update" — surgical find/replace.  "rewrite" — full replacement. */
  kind: "update" | "rewrite";
  /** Resolve the target artifact id from the patch tool-call args. */
  getArtifactId: (args: TArgs) => string | undefined;
  /**
   * Apply the patch to the artifact's current content. Return the new
   * content, or `{ ok: false, error }` to mark the operation as failed
   * (the error is surfaced back to the model via the tool result).
   */
  apply: (
    current: { content: string; mimeType: string },
    args: TArgs,
  ) => { ok: true; content: string } | { ok: false; error: string };
}

export interface ArtifactsConfig {
  toolkit?: Toolkit;
  types?: readonly ArtifactSpec[];
  patches?: readonly ArtifactPatchSpec[];
}

// ---------------------------------------------------------------------------
// Built-in create specs
// ---------------------------------------------------------------------------

export const htmlArtifactType: ArtifactSpec<{
  code: string;
  artifactId?: string;
}> = {
  toolName: "render_html",
  mimeType: "text/html",
  getContent: (a) => a?.code,
  getArtifactId: (a) => a?.artifactId,
  language: "html",
};

export const svgArtifactType: ArtifactSpec<{
  code: string;
  artifactId?: string;
}> = {
  toolName: "render_svg",
  mimeType: "image/svg+xml",
  getContent: (a) => a?.code,
  getArtifactId: (a) => a?.artifactId,
  language: "xml",
};

export const markdownArtifactType: ArtifactSpec<{
  markdown: string;
  artifactId?: string;
}> = {
  toolName: "render_markdown",
  mimeType: "text/markdown",
  getContent: (a) => a?.markdown,
  getArtifactId: (a) => a?.artifactId,
  language: "markdown",
};

export const mermaidArtifactType: ArtifactSpec<{
  code: string;
  artifactId?: string;
}> = {
  toolName: "render_mermaid",
  mimeType: "text/vnd.mermaid",
  getContent: (a) => a?.code,
  getArtifactId: (a) => a?.artifactId,
  language: "mermaid",
};

export const defaultArtifactTypes: readonly ArtifactSpec[] = [htmlArtifactType];

// ---------------------------------------------------------------------------
// Built-in patch specs — model-driven update / rewrite
// ---------------------------------------------------------------------------

/**
 * Surgical find-and-replace on an existing artifact's content. The `find`
 * string must match exactly once in the current content — zero or multiple
 * matches mark the operation as failed and surface a precise error to the
 * model, matching Claude artifacts' update semantics.
 */
export const updateArtifactPatch: ArtifactPatchSpec<{
  artifactId: string;
  find: string;
  replace: string;
}> = {
  toolName: "update_artifact",
  kind: "update",
  getArtifactId: (a) => a?.artifactId,
  apply: (current, args) => {
    if (!args || typeof args.find !== "string" || args.find.length === 0) {
      return {
        ok: false,
        error:
          "update_artifact requires a non-empty `find` string. Use rewrite_artifact for full replacements.",
      };
    }
    const first = current.content.indexOf(args.find);
    if (first === -1) {
      return {
        ok: false,
        error:
          "update_artifact: `find` string not found in artifact content. Either rewrite_artifact, or supply a `find` string that exactly matches one location.",
      };
    }
    const second = current.content.indexOf(args.find, first + 1);
    if (second !== -1) {
      return {
        ok: false,
        error:
          "update_artifact: `find` string matches multiple locations. Widen `find` so it uniquely identifies one location, or call update_artifact multiple times with disjoint `find` strings.",
      };
    }
    const replace = typeof args.replace === "string" ? args.replace : "";
    return {
      ok: true,
      content:
        current.content.slice(0, first) +
        replace +
        current.content.slice(first + args.find.length),
    };
  },
};

/** Full replacement of an artifact's content. */
export const rewriteArtifactPatch: ArtifactPatchSpec<{
  artifactId: string;
  code: string;
}> = {
  toolName: "rewrite_artifact",
  kind: "rewrite",
  getArtifactId: (a) => a?.artifactId,
  apply: (_current, args) => {
    if (!args || typeof args.code !== "string") {
      return {
        ok: false,
        error:
          "rewrite_artifact requires a `code` string with the new content.",
      };
    }
    return { ok: true, content: args.code };
  },
};

export const defaultArtifactPatches: readonly ArtifactPatchSpec[] = [
  updateArtifactPatch,
  rewriteArtifactPatch,
];

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * FNV-1a 32-bit hash — sync, deterministic, sufficient for React re-render
 * keys. SCF computes its own SHA-256 salt independently via enableBrowserCaching.
 */
const cheapHash = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

// ---------------------------------------------------------------------------
// Fold messages → artifact list (with operation history)
// ---------------------------------------------------------------------------

type ResolvedSpec =
  | { kind: "create"; spec: ArtifactSpec }
  | { kind: "patch"; spec: ArtifactPatchSpec };

type WorkingArtifact = {
  id: string;
  toolCallId: string;
  toolName: string;
  spec: ArtifactSpec;
  content: string;
  operations: ArtifactOperation[];
};

// Stable reference returned for ops that have not yet received a status
// report from the iframe. Stable identity matters because `useAuiState`
// compares results with `Object.is` — a fresh `{ status: "pending" }`
// literal would force spurious re-renders on every fold.
const PENDING_STATUS: ArtifactOperationStatus = Object.freeze({
  status: "pending",
});

/** @internal Exported for unit tests — pure fold of messages into artifact state. */
export const collectArtifacts = (
  messages: readonly { content: readonly any[] }[],
  byToolName: Map<string, ResolvedSpec>,
  statusByToolCallId: ReadonlyMap<string, ArtifactOperationStatus>,
): {
  artifacts: readonly Artifact[];
  /** Terminal statuses produced by folding (e.g. unknown-id patches), without mutating the input map. */
  foldStatuses: ReadonlyMap<string, ArtifactOperationStatus>;
} => {
  const working = new Map<string, WorkingArtifact>();
  const foldStatuses = new Map<string, ArtifactOperationStatus>();
  // Preserve creation order for stable enumeration.
  const order: string[] = [];

  for (const m of messages) {
    for (const part of m.content) {
      if (part?.type !== "tool-call") continue;
      const tc = part as ToolCallMessagePart;

      // Gate on "args fully streamed" — once argsText parses as JSON, the
      // tool call is in input-available state and we have everything we need
      // to fold this artifact in. We don't gate on `tc.result !== undefined`
      // because the result is precisely what the feedback loop is computing
      // (the iframe must mount and report status before the result lands).
      //
      // Partial argsText (mid-stream) is intentionally NOT folded: it would
      // cause the iframe runtime to re-mount + recompile + re-fetch the CDN
      // libraries on every token, spiking CPU and freezing the browser.
      // Consumers that want a live "streaming" view in chat should read
      // `argsText` directly off the message part in their tool render.
      if (typeof tc.argsText !== "string" || tc.argsText.length === 0) continue;
      try {
        JSON.parse(tc.argsText);
      } catch {
        continue;
      }

      const resolved = byToolName.get(tc.toolName);
      if (!resolved) continue;

      const status: ArtifactOperationStatus =
        statusByToolCallId.get(tc.toolCallId) ?? PENDING_STATUS;

      if (resolved.kind === "create") {
        const spec = resolved.spec;
        const content = spec.getContent(tc.args as any);
        if (typeof content !== "string") continue;
        const id = spec.getArtifactId?.(tc.args as any) ?? tc.toolCallId;

        const existing = working.get(id);
        if (existing) {
          // Re-issuing the create call on an existing id is treated as a
          // rewrite — same mimeType is preserved, new content overrides.
          const op: ArtifactOperation = {
            op: "rewrite",
            toolCallId: tc.toolCallId,
            content,
            result: status,
          };
          existing.content = content;
          existing.toolCallId = tc.toolCallId;
          existing.operations.push(op);
        } else {
          const op: ArtifactOperation = {
            op: "create",
            toolCallId: tc.toolCallId,
            content,
            result: status,
          };
          working.set(id, {
            id,
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            spec,
            content,
            operations: [op],
          });
          order.push(id);
        }
      } else {
        // patch
        const patch = resolved.spec;
        const id = patch.getArtifactId(tc.args as any);
        if (!id) continue;
        const target = working.get(id);
        if (!target) {
          // Patch targets an unknown artifact — record a failed status so
          // getOperationStatus(toolCallId) surfaces it to the tool result.
          const error = `${patch.toolName}: no artifact with id "${id}" exists. Available ids: ${order.length ? order.join(", ") : "(none)"}.`;
          const failedStatus: ArtifactOperationStatus = {
            status: "error",
            error: { message: error },
          };
          foldStatuses.set(tc.toolCallId, failedStatus);
          continue;
        }
        const result = patch.apply(
          { content: target.content, mimeType: target.spec.mimeType },
          tc.args as any,
        );
        if (!result.ok) {
          const failedStatus: ArtifactOperationStatus = {
            status: "error",
            error: { message: result.error },
          };
          const op: ArtifactOperation = {
            op: "failed",
            toolCallId: tc.toolCallId,
            content: target.content,
            applyError: result.error,
            result: failedStatus,
          };
          target.operations.push(op);
        } else {
          const op: ArtifactOperation = {
            op: patch.kind,
            toolCallId: tc.toolCallId,
            content: result.content,
            result: status,
          };
          target.content = result.content;
          target.toolCallId = tc.toolCallId;
          target.operations.push(op);
        }
      }
    }
  }

  return {
    artifacts: order.map<Artifact>((id) => {
      const w = working.get(id)!;
      const spec = w.spec;
      return {
        id: w.id,
        toolCallId: w.toolCallId,
        toolName: w.toolName,
        mimeType: spec.mimeType,
        content: w.content,
        contentHash: cheapHash(`${spec.mimeType}\0${w.content}`),
        ...(spec.language !== undefined && { language: spec.language }),
        ...(spec.renderToHtml !== undefined && {
          renderToHtml: spec.renderToHtml,
        }),
        operations: w.operations,
      };
    }),
    foldStatuses,
  };
};

/** Pure selection derivation shared by computeState and unit tests. */
export const deriveArtifactsListState = (
  artifacts: readonly Artifact[],
  selectedId: string | null,
): Pick<
  ArtifactsState,
  "selected" | "selectedId" | "selectedIndex" | "count" | "isFirst" | "isLast"
> => {
  const fallbackId = artifacts.at(-1)?.id ?? null;
  const effectiveId = selectedId ?? fallbackId;
  const idx = artifacts.findIndex((a) => a.id === effectiveId);
  const selected = idx >= 0 ? (artifacts[idx] ?? null) : null;
  const count = artifacts.length;
  return {
    selected,
    selectedId: effectiveId,
    selectedIndex: idx,
    count,
    isFirst: idx <= 0,
    isLast: idx === -1 || idx === count - 1,
  };
};

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

const ArtifactsResource = resource(
  ({ toolkit, types, patches }: ArtifactsConfig): ArtifactsMethods => {
    const typesArray = types ?? defaultArtifactTypes;
    const patchesArray = patches ?? defaultArtifactPatches;

    const byToolName = tapMemo(() => {
      const m = new Map<string, ResolvedSpec>();
      for (const t of typesArray)
        m.set(t.toolName, { kind: "create", spec: t });
      for (const p of patchesArray)
        m.set(p.toolName, { kind: "patch", spec: p });
      return m;
    }, [typesArray, patchesArray]);

    const clientRef = tapAssistantClientRef();

    // Register the toolkit on the parent `tools` scope (for render UI lookup
    // and model-context tool definitions). `attachTransformScopes` below
    // ensures a `tools` scope is mounted whenever the user does NOT provide
    // one explicitly, so this registration always has somewhere to land.
    //
    // The registration is deferred by one microtask: the auto-mounted `tools`
    // scope is a sibling fiber that may not have finished committing when
    // this effect first runs during the same commit pass. Without the defer,
    // calling `client.tools().setToolUI(...)` against an un-mounted fiber
    // throws "Resource updated before mount".
    tapEffect(() => {
      if (!toolkit) return;
      const client = clientRef.current;
      if (!client) return;

      let disposed = false;
      let unsubscribes: (() => void)[] | null = null;

      Promise.resolve().then(() => {
        if (disposed) return;
        const subs: (() => void)[] = [];

        // Register tool UI renderers
        for (const [toolName, tool] of Object.entries(toolkit)) {
          if (tool.render) {
            subs.push(client.tools().setToolUI(toolName, tool.render));
          }
        }

        // Register tool definitions with model context (strip render)
        const toolsWithoutRender = Object.entries(toolkit).reduce(
          (acc, [name, tool]) => {
            const { render: _, ...rest } = tool;
            acc[name] = rest as Tool<any, any>;
            return acc;
          },
          {} as Record<string, Tool<any, any>>,
        );
        subs.push(
          client.modelContext().register({
            getModelContext: () => ({ tools: toolsWithoutRender }),
          }),
        );

        unsubscribes = subs;
      });

      return () => {
        disposed = true;
        if (unsubscribes) {
          for (const fn of unsubscribes) fn();
        }
      };
    }, [toolkit, clientRef]);
    const [selectedId, setSelectedId] = tapState<string | null>(() => null);

    // Status reports from the iframe. Bumping `statusVersion` invalidates the
    // cache so React renders pick up new ok/error.
    const [statusVersion, setStatusVersion] = tapState<number>(() => 0);
    const statusMapRef = tapRef<Map<string, ArtifactOperationStatus>>(
      new Map(),
    );

    // Tool calls whose result we have already submitted (or scheduled to
    // submit) back to the model. The artifact tool calls have no server-side
    // `execute`, so the result is computed here once the operation reaches a
    // terminal status — this is what completes the tool call and drives the
    // model's auto-continue loop. Dedupe is synchronous so repeated calls
    // (from both reportOperationStatus and the computeState scan) are cheap.
    const resolvedToolCallsRef = tapRef<Set<string>>(new Set());

    // Idempotent: when an operation reaches a terminal status (ok/error) for a
    // tool call that does not yet have a result, submit the result exactly
    // once via the thread runtime. Side-effect-free synchronously (only
    // mutates the dedupe set and schedules a microtask) so it is safe to call
    // from computeState.
    const resolveToolCall = (
      toolCallId: string,
      status: ArtifactOperationStatus | null | undefined,
    ) => {
      const mapped = toolResultFromStatus(status);
      if (!mapped) return;
      if (resolvedToolCallsRef.current.has(toolCallId)) return;
      resolvedToolCallsRef.current.add(toolCallId);
      // Defer the side effect out of render with queueMicrotask.
      queueMicrotask(() => {
        const client = clientRef.current;
        if (!client) return;
        const threadAccessor = client.thread as any;
        if (!threadAccessor || threadAccessor.source === null) return;
        const runtime = client.thread().__internal_getRuntime?.();
        if (!runtime) return;
        // `addToolResult` lives on the ThreadRuntimeCore, reached via the
        // runtime's internal thread binding (it is not on the public
        // ThreadRuntime surface). Mirrors how MessagePartRuntime submits a
        // tool result.
        const core = (runtime as any).__internal_threadBinding?.getState?.();
        if (!core || typeof core.addToolResult !== "function") return;
        const messages = client.thread().getState().messages as readonly {
          id: string;
          content: readonly any[];
        }[];
        for (const m of messages) {
          for (const part of m.content) {
            if (part?.type === "tool-call" && part.toolCallId === toolCallId) {
              // Already resolved elsewhere; do not double-submit.
              if (part.result !== undefined) return;
              core.addToolResult({
                messageId: m.id,
                toolName: part.toolName,
                toolCallId,
                result: mapped.result,
                isError: mapped.isError,
              });
              return;
            }
          }
        }
      });
    };

    const EMPTY_STATE: ArtifactsState = {
      artifacts: [],
      selected: null,
      selectedId: null,
      selectedIndex: -1,
      count: 0,
      isFirst: true,
      isLast: true,
    };

    type CacheEntry = {
      messages: readonly { content: readonly any[] }[] | null;
      byToolName: Map<string, ResolvedSpec> | null;
      statusVersion: number;
      selectedId: string | null;
      artifacts: readonly Artifact[];
      foldStatuses: ReadonlyMap<string, ArtifactOperationStatus>;
      state: ArtifactsState;
    };
    const cacheRef = tapRef<CacheEntry | null>(null);

    const computeState = (): ArtifactsState => {
      const client = clientRef.current;
      if (!client) return EMPTY_STATE;
      const threadAccessor = client.thread as
        | {
            source: string | null;
            (): { getState(): { messages: readonly any[] } };
          }
        | undefined;
      if (!threadAccessor || threadAccessor.source === null) {
        return EMPTY_STATE;
      }
      const messages = client.thread().getState().messages as readonly {
        content: readonly any[];
      }[];

      const cache = cacheRef.current;
      const messagesChanged = !cache || cache.messages !== messages;
      const toolsChanged = !cache || cache.byToolName !== byToolName;
      const statusChanged = !cache || cache.statusVersion !== statusVersion;
      const selectedIdChanged = !cache || cache.selectedId !== selectedId;

      const artifactsRecomputed =
        !cache || messagesChanged || toolsChanged || statusChanged;
      const collected = artifactsRecomputed
        ? collectArtifacts(messages, byToolName, statusMapRef.current)
        : null;
      const artifacts = collected?.artifacts ?? cache?.artifacts ?? [];
      const foldStatuses =
        collected?.foldStatuses ?? cache?.foldStatuses ?? new Map();

      // Whenever artifacts (and thus their operation statuses) were
      // recomputed, scan for terminal statuses and resolve the corresponding
      // tool calls. This covers fold-produced errors (failed update/rewrite,
      // unknown-id patches) that never round-trip through the iframe. The
      // iframe round-trip path is handled in reportOperationStatus. Calls are
      // cheap/idempotent thanks to resolvedToolCallsRef + queueMicrotask, and
      // resolveToolCall is side-effect-free synchronously so this is safe
      // inside computeState. Only runs when artifacts were recomputed to
      // avoid per-render cost.
      if (artifactsRecomputed) {
        for (const a of artifacts) {
          for (const op of a.operations) {
            if (op.result.status !== "pending") {
              resolveToolCall(op.toolCallId, op.result);
            }
          }
        }
        for (const [toolCallId, status] of foldStatuses) {
          if (status.status !== "pending") {
            resolveToolCall(toolCallId, status);
          }
        }
        for (const [toolCallId, status] of statusMapRef.current) {
          if (status.status !== "pending") {
            resolveToolCall(toolCallId, status);
          }
        }
      }

      if (
        cache &&
        !messagesChanged &&
        !toolsChanged &&
        !statusChanged &&
        !selectedIdChanged &&
        cache.artifacts === artifacts
      ) {
        return cache.state;
      }

      const state: ArtifactsState = {
        artifacts,
        ...deriveArtifactsListState(artifacts, selectedId),
      };

      cacheRef.current = {
        messages,
        byToolName,
        statusVersion,
        selectedId,
        artifacts,
        foldStatuses,
        state,
      };
      return state;
    };

    const resolveSelection = (
      prev: string | null,
    ): {
      artifacts: readonly Artifact[];
      effectiveIndex: number;
    } => {
      const artifacts = cacheRef.current?.artifacts ?? [];
      return {
        artifacts,
        effectiveIndex: deriveArtifactsListState(artifacts, prev).selectedIndex,
      };
    };

    const select = tapCallback((id: string | null) => {
      setSelectedId(id);
    }, []);

    // biome-ignore lint/correctness/useExhaustiveDependencies: resolveSelection closes over stable refs (cacheRef); read-current by design
    const selectIndex = tapCallback((index: number) => {
      setSelectedId((prev) => {
        const r = resolveSelection(prev);
        const a = r.artifacts[index];
        return a ? a.id : null;
      });
    }, []);

    // biome-ignore lint/correctness/useExhaustiveDependencies: resolveSelection closes over stable refs (cacheRef); read-current by design
    const selectPrevious = tapCallback(() => {
      setSelectedId((prev) => {
        const r = resolveSelection(prev);
        return r.effectiveIndex > 0
          ? (r.artifacts[r.effectiveIndex - 1]?.id ?? prev)
          : prev;
      });
    }, []);

    // biome-ignore lint/correctness/useExhaustiveDependencies: resolveSelection closes over stable refs (cacheRef); read-current by design
    const selectNext = tapCallback(() => {
      setSelectedId((prev) => {
        const r = resolveSelection(prev);
        const last = r.artifacts.length - 1;
        return r.effectiveIndex >= 0 && r.effectiveIndex < last
          ? (r.artifacts[r.effectiveIndex + 1]?.id ?? prev)
          : prev;
      });
    }, []);

    const getOperationStatus = tapCallback(
      (toolCallId: string): ArtifactOperationStatus | null => {
        const status = statusMapRef.current.get(toolCallId);
        if (status) return status;
        const cache = cacheRef.current;
        const foldStatus = cache?.foldStatuses.get(toolCallId);
        if (foldStatus) return foldStatus;
        // Fall back to scanning artifact operations — covers the case where
        // the fold itself produced the status (e.g. a failed `update_artifact`
        // with no iframe round trip).
        if (cache) {
          for (const a of cache.artifacts) {
            for (const op of a.operations) {
              if (op.toolCallId === toolCallId) return op.result;
            }
          }
        }
        return null;
      },
      [],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: resolveToolCall closes over stable refs (resolvedToolCallsRef, clientRef); read-current by design
    const reportOperationStatus = tapCallback(
      (
        toolCallId: string,
        status: { ok: true } | { ok: false; error: ArtifactStatusError },
      ) => {
        const next: ArtifactOperationStatus = status.ok
          ? { status: "ok" }
          : { status: "error", error: status.error };
        statusMapRef.current.set(toolCallId, next);
        setStatusVersion((v) => v + 1);
        // Complete the tool call now that the iframe round-trip produced a
        // terminal status (covers create/rewrite of html/react artifacts).
        resolveToolCall(toolCallId, next);
      },
      [],
    );

    return {
      getState: computeState,
      select,
      selectIndex,
      selectPrevious,
      selectNext,
      getOperationStatus,
      reportOperationStatus,
    };
  },
);

export const Artifacts: {
  (): ResourceElement<ArtifactsMethods, undefined>;
  (config: ArtifactsConfig): ResourceElement<ArtifactsMethods, ArtifactsConfig>;
} = ArtifactsResource as any;

attachTransformScopes(ArtifactsResource, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
  // Auto-mount an empty `tools` scope when the user does not provide one,
  // so the toolkit registrations from inside Artifacts have somewhere to
  // land. If the user mounts `tools: Tools({ toolkit: ... })` explicitly,
  // their toolkit is merged with the Artifacts toolkit at the parent scope.
  if (!scopes.tools && parent.tools.source === null) {
    scopes.tools = Tools({ toolkit: {} });
  }
});
