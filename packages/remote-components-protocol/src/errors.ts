/**
 * Error codes surfaced by the remote-components system. Codes are part of the
 * public contract: hosts switch on them in `onError`.
 */
export type RemoteErrorCode =
  /** No handshake (or no `ready`) within the host's timeout. */
  | "timeout"
  /** Host and remote share no protocol version, or a message was malformed. */
  | "protocol"
  /** An uncaught error / unhandled rejection inside the remote. Non-fatal. */
  | "runtime"
  /** A value could not be sent across the boundary (functions in RPC args, symbols, …). */
  | "data"
  /** The channel closed (unmount, reload) while a call was pending. */
  | "closed"
  /** The caller aborted the call (AbortSignal in the arguments); seen by the callee's signal. */
  | "cancelled"
  /** A function reference no longer points at a function (stale prop path). */
  | "stale-function"
  /** Overlay request rejected by the host (origin not allowed, bad params). */
  | "overlay"
  /** A remote request named a method the other side does not implement. */
  | "unsupported"
  /** The remote document could not be loaded (network / HTTP error detected). */
  | "load"
  /** A configuration the host refuses for safety (e.g. same-origin remote with allow-same-origin). */
  | "security";

export class RemoteComponentError extends Error {
  override name = "RemoteComponentError";
  readonly code: RemoteErrorCode;
  /** Extra structured-cloneable detail (e.g. offending path for `data`). */
  readonly data: unknown;

  constructor(
    code: RemoteErrorCode,
    message: string,
    options?: { cause?: unknown; data?: unknown },
  ) {
    super(
      message,
      options?.cause === undefined ? undefined : { cause: options.cause },
    );
    this.code = code;
    this.data = options?.data;
  }
}

/** Wire form of an error. Always a plain object so it survives structured clone everywhere. */
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  data?: unknown;
}

export function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    const out: SerializedError = { name: err.name, message: err.message };
    if (typeof err.stack === "string") out.stack = err.stack;
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") out.code = code;
    const data = (err as { data?: unknown }).data;
    if (data !== undefined && isCloneableSafe(data)) out.data = data;
    return out;
  }
  if (typeof err === "string") return { name: "Error", message: err };
  let message: string;
  try {
    message = JSON.stringify(err) ?? String(err);
  } catch {
    message = String(err);
  }
  return { name: "Error", message };
}

/**
 * Rebuilds an Error from its wire form. The result is a plain `Error` (or a
 * `RemoteComponentError` when `code` is a known code) whose `name` is set to
 * the original name; prototype chains of custom error classes do not cross
 * the boundary.
 */
export function deserializeError(s: SerializedError): Error {
  let err: Error;
  if (s.code !== undefined && isRemoteErrorCode(s.code)) {
    err = new RemoteComponentError(s.code, s.message, { data: s.data });
  } else {
    err = new Error(s.message);
    if (s.code !== undefined) (err as Error & { code?: string }).code = s.code;
    if (s.data !== undefined) (err as Error & { data?: unknown }).data = s.data;
  }
  err.name = s.name;
  if (s.stack !== undefined) err.stack = s.stack;
  return err;
}

const CODES: ReadonlySet<string> = new Set<RemoteErrorCode>([
  "timeout",
  "protocol",
  "runtime",
  "data",
  "closed",
  "cancelled",
  "stale-function",
  "overlay",
  "unsupported",
  "load",
  "security",
]);

export function isRemoteErrorCode(code: string): code is RemoteErrorCode {
  return CODES.has(code);
}

function isCloneableSafe(v: unknown): boolean {
  try {
    structuredClone(v);
    return true;
  } catch {
    return false;
  }
}
