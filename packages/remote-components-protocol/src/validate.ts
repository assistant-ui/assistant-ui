/**
 * Runtime validation of messages received from the other side. Both sides
 * treat the peer as untrusted: the host does not trust remote content, and a
 * remote does not trust an arbitrary embedding page. Every message is checked
 * structurally before it is dispatched; invalid messages are dropped (and
 * reported through the channel's `onInvalid` hook).
 */
import type {
  HostMethods,
  HostNotifications,
  InitializeRequest,
  InitializeResponse,
  RemoteMethods,
  RemoteNotifications,
} from "./messages.js";

export type Check = (v: unknown) => boolean;

export const str: Check = (v) => typeof v === "string";
export const num: Check = (v) => typeof v === "number" && Number.isFinite(v);
export const nonNeg: Check = (v) => num(v) && (v as number) >= 0;
export const int: Check = (v) => Number.isSafeInteger(v);
export const bool: Check = (v) => typeof v === "boolean";
export const any: Check = () => true;
export const oneOf =
  (...vals: readonly unknown[]): Check =>
  (v) =>
    vals.includes(v);
export const opt =
  (c: Check): Check =>
  (v) =>
    v === undefined || c(v);
export const nullable =
  (c: Check): Check =>
  (v) =>
    v === null || c(v);
export const arr =
  (c: Check, max = Infinity): Check =>
  (v) =>
    Array.isArray(v) && v.length <= max && v.every(c);
export const obj = (shape: Record<string, Check>): Check => {
  const entries = Object.entries(shape);
  return (v) =>
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    entries.every(([k, c]) => c((v as Record<string, unknown>)[k]));
};
export const record =
  (c: Check): Check =>
  (v) =>
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.values(v).every(c);

// Function/signal paths never name prototype machinery (decode would otherwise write onto a prototype).
const pathKey: Check = (v) =>
  (typeof v === "string" &&
    v !== "__proto__" &&
    v !== "constructor" &&
    v !== "prototype") ||
  (int(v) && (v as number) >= 0);
export const path = arr(pathKey, 64);
export const encoded = obj({
  v: any,
  f: opt(arr(path, 10_000)),
  s: opt(arr(path, 64)),
});
const versionRange = obj({ min: int, max: int });
const rect = obj({ x: num, y: num, width: nonNeg, height: nonNeg });
const fnRef = obj({ scope: str, path });
const serializedError = obj({
  name: str,
  message: str,
  stack: opt(str),
  code: opt(str),
});
const sizeReport = obj({
  width: nonNeg,
  height: nonNeg,
  minContent: nonNeg,
  maxContent: nonNeg,
});
const placement = obj({
  side: oneOf("top", "bottom", "left", "right"),
  align: oneOf("start", "center", "end"),
});
const fontFace = obj({
  family: str,
  src: str,
  weight: opt(str),
  style: opt(str),
  stretch: opt(str),
  display: opt(str),
  unicodeRange: opt(str),
});
const theme = obj({
  inherited: record(str),
  vars: record(str),
  fonts: arr(fontFace, 256),
  lang: str,
  rootFontSize: str,
});
const containerInfo = obj({
  width: nonNeg,
  height: nullable(nonNeg),
  name: (v) => str(v) && (v as string).length <= 256,
  type: oneOf("inline-size", "size"),
});
const layout = obj({
  width: nonNeg,
  height: nullable(nonNeg),
  offsetX: num,
  offsetY: num,
  containers: opt(arr(containerInfo, 2)),
  viewportHeight: opt(nonNeg),
});
const id = (v: unknown) =>
  str(v) && (v as string).length > 0 && (v as string).length <= 128;

const initPayload = obj({
  src: str,
  props: record(encoded),
  theme,
  layout,
  overlay: opt(obj({ kind: oneOf("popover", "dialog") })),
});

const jsonrpc = oneOf("2.0");
const session = (v: unknown) =>
  str(v) && (v as string).length >= 8 && (v as string).length <= 64;
const initializeRequest = obj({
  jsonrpc,
  id: session,
  method: oneOf("rc/initialize"),
  params: obj({ nonce: str, session, protocol: versionRange, runtime: str }),
});
const initializeResult = obj({
  jsonrpc,
  id: str,
  result: obj({ nonce: str, protocol: int, init: initPayload }),
});
const initializeError = obj({
  jsonrpc,
  id: str,
  error: obj({
    code: int,
    message: str,
    data: obj({ name: str, message: str, nonce: str, supported: versionRange }),
  }),
});

/** `rc/initialize` from a remote (host side of the handshake). */
export function isInitializeRequest(v: unknown): v is InitializeRequest {
  return initializeRequest(v);
}

/** The host's answer to `rc/initialize` (remote side of the handshake). */
export function isInitializeResponse(v: unknown): v is InitializeResponse {
  return initializeResult(v) || initializeError(v);
}

type Schema<T> = { [K in keyof T]: Check };

const cancelled = obj({ requestId: int });

export const hostNotificationSchema: Schema<HostNotifications> = {
  "rc/notifications/props-changed": obj({
    seq: int,
    set: record(encoded),
    del: arr(str),
  }),
  "rc/notifications/theme-changed": obj({ theme }),
  "rc/notifications/layout-changed": obj({ layout }),
  "rc/notifications/overlay-dismissed": obj({
    id,
    reason: oneOf("escape", "outside", "host", "error", "unmount"),
  }),
  "rc/notifications/cancelled": cancelled,
};

export const remoteNotificationSchema: Schema<RemoteNotifications> = {
  "rc/notifications/ready": obj({ size: sizeReport }),
  "rc/notifications/size-changed": obj({ size: sizeReport }),
  "rc/notifications/error": obj({ error: serializedError }),
  "rc/notifications/overlay-anchor-changed": obj({ id, anchor: rect }),
  "rc/notifications/pointer-down": obj({ insideAnchorOf: arr(str, 64) }),
  "rc/notifications/escape-pressed": obj({}),
  "rc/notifications/focus-exit": obj({ direction: oneOf("next", "previous") }),
  "rc/notifications/focus-enter": obj({}),
  "rc/notifications/focus-changed": obj({ rect }),
  "rc/notifications/cancelled": cancelled,
};

const call = obj({ ref: fnRef, args: encoded });

export const hostMethodSchema: Schema<HostMethods> = {
  "rc/call": call,
  "rc/overlay/open": obj({
    id,
    kind: oneOf("popover", "dialog"),
    content: (v) =>
      obj({ src: str, props: encoded })(v) ||
      obj({
        html: (h) => str(h) && (h as string).length <= 2_000_000,
        props: encoded,
      })(v),
    anchor: opt(rect),
    placement: opt(placement),
    offset: opt(num),
    label: opt(str),
    matchAnchorWidth: opt(bool),
  }),
  "rc/overlay/update": obj({
    id,
    anchor: opt(rect),
    props: opt(encoded),
    placement: opt(placement),
    offset: opt(num),
    label: opt(str),
    matchAnchorWidth: opt(bool),
  }),
  "rc/overlay/close": obj({ id }),
};

export const remoteMethodSchema: Schema<RemoteMethods> = {
  "rc/call": call,
  "rc/focus": obj({
    target: oneOf("first", "last", "restore"),
    focusVisible: opt(bool),
  }),
};

const has = (o: object, k: string): boolean =>
  Object.prototype.hasOwnProperty.call(o, k);
const errorObject = obj({ code: int, message: str, data: serializedError });

/**
 * Builds a validator for JSON-RPC messages arriving on one side of the
 * channel. `notifications` are the notifications this side receives;
 * `methods` the requests it serves.
 */
export function messageValidator(
  notifications: Record<string, Check>,
  methods: Record<string, Check>,
): ((v: unknown) => boolean) & { known(v: unknown): boolean } {
  const validate = (v: unknown): boolean => {
    if (
      v === null ||
      typeof v !== "object" ||
      (v as { jsonrpc?: unknown }).jsonrpc !== "2.0"
    )
      return false;
    const m = v as {
      id?: unknown;
      method?: unknown;
      params?: unknown;
      result?: unknown;
      error?: unknown;
    };
    if (m.method === undefined) {
      // A response: exactly one of result / error.
      if (!int(m.id)) return false;
      return has(m, "error")
        ? !has(m, "result") && errorObject(m.error)
        : has(m, "result");
    }
    if (typeof m.method !== "string") return false;
    if (m.id !== undefined) {
      if (!int(m.id)) return false;
      return has(methods, m.method)
        ? (methods[m.method] as Check)(m.params)
        : true; // unknown methods get an "unsupported" response
    }
    if (!has(notifications, m.method)) return false;
    return (notifications[m.method] as Check)(m.params);
  };
  /** False for notifications this version does not know: drop those silently (SPEC §3), they are not errors. */
  const known = (v: unknown): boolean => {
    if (v === null || typeof v !== "object") return true;
    const m = v as { id?: unknown; method?: unknown };
    return (
      m.method === undefined ||
      m.id !== undefined ||
      (typeof m.method === "string" && has(notifications, m.method))
    );
  };
  return Object.assign(validate, { known });
}

/** Validates messages the host receives from a remote. */
export const validateFromRemote = /* @__PURE__ */ messageValidator(
  remoteNotificationSchema,
  hostMethodSchema,
);
/** Validates messages a remote receives from the host. */
export const validateFromHost = /* @__PURE__ */ messageValidator(
  hostNotificationSchema,
  remoteMethodSchema,
);
