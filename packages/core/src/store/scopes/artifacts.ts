export type ArtifactStatusError = {
  message: string;
  stack?: string;
  name?: string;
};

export type ArtifactOperationStatus =
  | { status: "pending" }
  | { status: "ok" }
  | { status: "error"; error: ArtifactStatusError };

export type ArtifactOperation = {
  /**
   * `"create"` — produced a new artifact (the first tool call for this id).
   * `"update"` — surgical find/replace on existing content.
   * `"rewrite"` — full replacement of existing content.
   * `"failed"` — the operation could not be applied (e.g. patch target not
   * found, ambiguous match). Content is unchanged.
   */
  op: "create" | "update" | "rewrite" | "failed";
  toolCallId: string;
  /** Snapshot of the content this operation produced. */
  content: string;
  /**
   * Reason this operation could not be applied (only set when `op ===
   * "failed"`). Surfaced back to the model via the tool result so it can
   * adjust and retry.
   */
  applyError?: string;
  /** Iframe mount status reported via the `aui:artifact:status` channel. */
  result: ArtifactOperationStatus;
};

export type Artifact = {
  /**
   * Stable artifact identity. Model-provided via `args.artifactId` on the
   * create tool call, or defaults to the create toolCallId. Subsequent
   * update / rewrite calls target the same artifact by id.
   */
  id: string;
  /** Tool call that produced the current content (the latest operation). */
  toolCallId: string;
  /** Tool name of the create call. */
  toolName: string;
  mimeType: string;
  /** Current content after folding all operations in order. */
  content: string;
  /** FNV-1a 32-bit hash of (mimeType + "\0" + content), hex, 8 chars. */
  contentHash: string;
  language?: string;
  renderToHtml?: (content: string) => string | Promise<string>;
  /** Full operation history for this artifact, in chronological order. */
  operations: readonly ArtifactOperation[];
};

export type ArtifactsState = {
  artifacts: readonly Artifact[];
  selected: Artifact | null;
  selectedId: string | null;
  /** 0-based index of the selected artifact, or -1 if none. */
  selectedIndex: number;
  count: number;
  isFirst: boolean;
  isLast: boolean;
};

export type ArtifactsMethods = {
  getState(): ArtifactsState;
  select(id: string | null): void;
  selectIndex(index: number): void;
  selectPrevious(): void;
  selectNext(): void;
  /**
   * Look up the status of a specific operation by its toolCallId. Returns
   * `null` when the toolCallId does not correspond to a known operation.
   */
  getOperationStatus(toolCallId: string): ArtifactOperationStatus | null;
  /**
   * Report the iframe-side mount status for a toolCallId. Called by
   * `ArtifactPrimitive.Preview` when it receives an `aui:artifact:status`
   * postMessage from the runtime.
   */
  reportOperationStatus(
    toolCallId: string,
    status: { ok: true } | { ok: false; error: ArtifactStatusError },
  ): void;
};

export type ArtifactsClientSchema = {
  methods: ArtifactsMethods;
};
