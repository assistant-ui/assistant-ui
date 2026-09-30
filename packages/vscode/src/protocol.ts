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

const WEBVIEW_TO_HOST_KINDS = new Set([
  "fetch:request",
  "fetch:abort",
  "rpc:request",
]);
const HOST_TO_WEBVIEW_KINDS = new Set([
  "fetch:head",
  "fetch:chunk",
  "fetch:end",
  "fetch:error",
  "rpc:response",
]);

const isEnvelope = (
  value: unknown,
): value is { channel: string; kind: string; id: string } =>
  typeof value === "object" &&
  value !== null &&
  (value as { channel?: unknown }).channel === VSCODE_BRIDGE_CHANNEL &&
  typeof (value as { kind?: unknown }).kind === "string" &&
  typeof (value as { id?: unknown }).id === "string";

export const isWebviewToHostMessage = (
  value: unknown,
): value is WebviewToHostMessage =>
  isEnvelope(value) && WEBVIEW_TO_HOST_KINDS.has(value.kind);

export const isHostToWebviewMessage = (
  value: unknown,
): value is HostToWebviewMessage =>
  isEnvelope(value) && HOST_TO_WEBVIEW_KINDS.has(value.kind);
