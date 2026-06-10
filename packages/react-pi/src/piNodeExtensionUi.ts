/**
 * The `ExtensionUIContext` bridge for the node host.
 *
 * Pi has NO built-in approval/permission system — the entire human-in-the-loop
 * surface is extensions/tools calling `ctx.ui.confirm / select / input /
 * editor`. On the SDK-direct path this does not work for free: the host
 * must implement `ExtensionUIContext` and bind it via `session.bindExtensions`,
 * re-binding after every session replacement. Without it, `ctx.hasUI` is false
 * and permission gates silently degrade.
 *
 * This module is the host-side implementation:
 * - the four **blocking** dialogs become `PiHostUiRequest`s emitted to clients
 *   and resolved by `respondToHostUiRequest` (a real wired loop, not display);
 * - every other method **degrades** (no-op / typed-unsupported) so extensions
 *   written for the interactive TUI don't crash in a headless host.
 *
 * Verified against `pi-coding-agent/dist/core/extensions/types.d.ts`. Response
 * semantics: `confirm → boolean` (cancel/timeout/dismiss = `false`, no separate
 * "cancelled" channel); `select`/`input`/`editor → string | undefined`
 * (`undefined` = dismissed).
 */
import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import type { PiHostUiRequest, PiHostUiResponse } from "./piTypes";

/** Thrown by `custom()` — the one host-UI method with no headless degradation
 * (it renders an arbitrary interactive TUI component). This gives extensions a
 * typed unsupported issue they can catch rather than hanging. */
export class PiUnsupportedHostUiError extends Error {
  constructor(public readonly method: string) {
    super(
      `Pi host-UI method "${method}" is not supported in the assistant-ui node host.`,
    );
    this.name = "PiUnsupportedHostUiError";
  }
}

export interface SupervisorUiBridgeDeps {
  /** Allocate a fresh, per-thread-unique request id. */
  nextRequestId: () => string;
  /** Single-tool causality: the executing tool's id iff exactly one tool is
   * running, else undefined. The bridge stamps it verbatim and never infers. */
  currentToolCallId: () => string | undefined;
  /** Emit a blocking request to subscribers (→ `extension_ui_request`). */
  emitRequest: (request: PiHostUiRequest) => void;
  /** Emit resolution to subscribers (→ `extension_ui_resolved`). */
  emitResolved: (requestId: string) => void;
  /** Optional sink for non-blocking `notify` messages. */
  onNotify?: (message: string, type: "info" | "warning" | "error") => void;
}

export interface SupervisorUiBridge {
  /** The `ExtensionUIContext` to bind via `session.bindExtensions`. */
  readonly ui: ExtensionUIContext;
  /** Currently-pending blocking requests (survive reconnect — tracked here, not
   * on any client connection). Oldest first. */
  pending: () => PiHostUiRequest[];
  /** Resolve a pending request from a client response. Returns false if the id
   * is unknown (already resolved or never existed). */
  resolve: (response: PiHostUiResponse) => boolean;
  /** Settle every pending request as dismissed (e.g. on session teardown). */
  dismissAll: () => void;
}

type DialogOpts = { signal?: AbortSignal; timeout?: number } | undefined;

type PendingEntry = {
  request: PiHostUiRequest;
  settle: (response: PiHostUiResponse) => void;
  dismiss: () => void;
};

const valueOrUndefined = (response: PiHostUiResponse): string | undefined =>
  "value" in response ? response.value : undefined;

export const createSupervisorUiBridge = (
  deps: SupervisorUiBridgeDeps,
): SupervisorUiBridge => {
  const pendingById = new Map<string, PendingEntry>();

  /** Register a blocking request and return a promise that resolves to the
   * dialog's native return value (or `dismissValue` on abort/timeout/dismiss). */
  const ask = <T>(
    request: PiHostUiRequest,
    toNative: (response: PiHostUiResponse) => T,
    dismissValue: T,
    opts: DialogOpts,
  ): Promise<T> =>
    new Promise<T>((resolvePromise) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => finish(dismissValue);
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        opts?.signal?.removeEventListener("abort", onAbort);
      };
      const finish = (value: T) => {
        if (settled) return;
        settled = true;
        pendingById.delete(request.id);
        cleanup();
        deps.emitResolved(request.id);
        resolvePromise(value);
      };

      pendingById.set(request.id, {
        request,
        settle: (response) => finish(toNative(response)),
        dismiss: () => finish(dismissValue),
      });

      if (opts?.signal) {
        if (opts.signal.aborted) {
          finish(dismissValue);
          return;
        }
        opts.signal.addEventListener("abort", onAbort);
      }
      if (opts?.timeout && opts.timeout > 0) {
        timer = setTimeout(() => finish(dismissValue), opts.timeout);
      }
      deps.emitRequest(request);
    });

  /** Common request fields. `toolCallId`/`timeoutMs` are omitted when absent so
   * the JSON-safe payload stays clean under `exactOptionalPropertyTypes`. */
  const correlation = (opts: DialogOpts) => {
    const toolCallId = deps.currentToolCallId();
    return {
      ...(toolCallId ? { toolCallId } : {}),
      ...(opts?.timeout ? { timeoutMs: opts.timeout } : {}),
    };
  };

  const ui: ExtensionUIContext = {
    confirm: (title, message, opts) => {
      const request: PiHostUiRequest = {
        id: deps.nextRequestId(),
        kind: "confirm",
        title,
        message,
        ...correlation(opts),
      };
      return ask(
        request,
        (r) => ("confirmed" in r ? r.confirmed : false),
        false,
        opts,
      );
    },

    select: (title, options, opts) => {
      const request: PiHostUiRequest = {
        id: deps.nextRequestId(),
        kind: "select",
        title,
        options,
        ...correlation(opts),
      };
      return ask(request, valueOrUndefined, undefined, opts);
    },

    input: (title, placeholder, opts) => {
      const request: PiHostUiRequest = {
        id: deps.nextRequestId(),
        kind: "input",
        title,
        ...(placeholder !== undefined ? { placeholder } : {}),
        ...correlation(opts),
      };
      return ask(request, valueOrUndefined, undefined, opts);
    },

    editor: (title, prefill) => {
      // `editor` takes no dialog options in the SDK (no signal/timeout).
      const toolCallId = deps.currentToolCallId();
      const request: PiHostUiRequest = {
        id: deps.nextRequestId(),
        kind: "editor",
        title,
        ...(prefill !== undefined ? { prefill } : {}),
        ...(toolCallId ? { toolCallId } : {}),
      };
      return ask(request, valueOrUndefined, undefined, undefined);
    },

    // --- Fire-and-forget / display surfaces: degrade, never crash --------------
    notify: (message, type) => deps.onNotify?.(message, type ?? "info"),
    onTerminalInput: () => () => {},
    setStatus: () => {},
    setWorkingMessage: () => {},
    setWorkingVisible: () => {},
    setWorkingIndicator: () => {},
    setHiddenThinkingLabel: () => {},
    setWidget: () => {},
    setFooter: () => {},
    setHeader: () => {},
    setTitle: () => {},
    pasteToEditor: () => {},
    setEditorText: () => {},
    getEditorText: () => "",
    addAutocompleteProvider: () => {},
    setEditorComponent: () => {},
    getEditorComponent: () => undefined,
    getToolsExpanded: () => false,
    setToolsExpanded: () => {},

    // --- No headless equivalent ------------------------------------------------
    custom: () => Promise.reject(new PiUnsupportedHostUiError("custom")),

    // --- Theme surface: inert, but answers so reads don't throw ----------------
    get theme() {
      return {} as ExtensionUIContext["theme"];
    },
    getAllThemes: () => [],
    getTheme: () => undefined,
    setTheme: () => ({
      success: false,
      error: "Themes are not supported in the assistant-ui node host.",
    }),
  };

  return {
    ui,
    pending: () => [...pendingById.values()].map((e) => e.request),
    resolve: (response) => {
      const entry = pendingById.get(response.requestId);
      if (!entry) return false;
      entry.settle(response);
      return true;
    },
    dismissAll: () => {
      for (const entry of [...pendingById.values()]) entry.dismiss();
    },
  };
};
