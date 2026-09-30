export type VSCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState<T>(state: T): T;
};

declare function acquireVsCodeApi(): VSCodeApi;

let api: VSCodeApi | undefined;

// acquireVsCodeApi throws when called a second time in the same webview.
export const getVSCodeApi = (): VSCodeApi => {
  api ??= acquireVsCodeApi();
  return api;
};
