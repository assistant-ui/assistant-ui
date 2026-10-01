export const VSCODE_BRIDGE_CHANNEL = "aui-vscode";

export const VSCODE_VIRTUAL_ORIGIN = "https://webview.vscode.invalid";

export type BridgeHeaders = [name: string, value: string][];

type BridgeEnvelope<TKind extends string> = {
  channel: typeof VSCODE_BRIDGE_CHANNEL;
  kind: TKind;
  id: string;
};

export type FetchRequestMessage = BridgeEnvelope<"fetch:request"> & {
  url: string;
  method: string;
  headers: BridgeHeaders;
  body: Uint8Array<ArrayBuffer> | null;
};

export type FetchAbortMessage = BridgeEnvelope<"fetch:abort">;

export type FetchHeadMessage = BridgeEnvelope<"fetch:head"> & {
  status: number;
  statusText: string;
  headers: BridgeHeaders;
};

export type FetchChunkMessage = BridgeEnvelope<"fetch:chunk"> & {
  chunk: Uint8Array<ArrayBuffer>;
};

export type FetchEndMessage = BridgeEnvelope<"fetch:end">;

export type FetchErrorMessage = BridgeEnvelope<"fetch:error"> & {
  message: string;
};

export type RpcRequestMessage = BridgeEnvelope<"rpc:request"> & {
  method: string;
  params: unknown[];
};

export type RpcResponseMessage = BridgeEnvelope<"rpc:response"> &
  ({ ok: true; result: unknown } | { ok: false; message: string });

export type WebviewToHostMessage =
  | FetchRequestMessage
  | FetchAbortMessage
  | RpcRequestMessage;

export type HostToWebviewMessage =
  | FetchHeadMessage
  | FetchChunkMessage
  | FetchEndMessage
  | FetchErrorMessage
  | RpcResponseMessage;

export type BridgeMessage = WebviewToHostMessage | HostToWebviewMessage;

type Fields = Record<string, unknown>;

const isString = (value: unknown): value is string => typeof value === "string";

const isBytes = (value: unknown) => value instanceof Uint8Array;

const isHeaders = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      isString(entry[0]) &&
      isString(entry[1]),
  );

const hasNoPayload = () => true;

const WEBVIEW_TO_HOST: Record<
  WebviewToHostMessage["kind"],
  (message: Fields) => boolean
> = {
  "fetch:request": (m) =>
    isString(m.url) &&
    isString(m.method) &&
    isHeaders(m.headers) &&
    (m.body === null || isBytes(m.body)),
  "fetch:abort": hasNoPayload,
  "rpc:request": (m) => isString(m.method) && Array.isArray(m.params),
};

const HOST_TO_WEBVIEW: Record<
  HostToWebviewMessage["kind"],
  (message: Fields) => boolean
> = {
  "fetch:head": (m) =>
    typeof m.status === "number" &&
    isString(m.statusText) &&
    isHeaders(m.headers),
  "fetch:chunk": (m) => isBytes(m.chunk),
  "fetch:end": hasNoPayload,
  "fetch:error": (m) => isString(m.message),
  "rpc:response": (m) =>
    m.ok === true || (m.ok === false && isString(m.message)),
};

const matches = (
  validators: Record<string, (message: Fields) => boolean>,
  value: unknown,
) => {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Fields;
  return (
    message.channel === VSCODE_BRIDGE_CHANNEL &&
    isString(message.id) &&
    isString(message.kind) &&
    Object.hasOwn(validators, message.kind) &&
    validators[message.kind]!(message)
  );
};

export const isWebviewToHostMessage = (
  value: unknown,
): value is WebviewToHostMessage => matches(WEBVIEW_TO_HOST, value);

export const isHostToWebviewMessage = (
  value: unknown,
): value is HostToWebviewMessage => matches(HOST_TO_WEBVIEW, value);
