export { getVSCodeApi, type VSCodeApi } from "./webview/vscode-api";
export {
  createVSCodeFetch,
  vscodeFetch,
  type VSCodeBridgePort,
  type VSCodeFetch,
} from "./webview/fetch";
export {
  createVSCodeModelAdapter,
  type VSCodeModelAdapterOptions,
} from "./webview/model-adapter";
export type { VSCodeModelRequest } from "./model-request";
export * from "./protocol";
