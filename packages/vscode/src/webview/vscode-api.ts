export type VSCodeApi<TState = unknown> = {
  postMessage(message: unknown): void;
  getState(): TState | undefined;
  setState<T extends TState | undefined>(newState: T): T;
};

let api: VSCodeApi | undefined;

/**
 * Returns the webview's VS Code API. `acquireVsCodeApi()` may only be called
 * once per webview, so every caller in the webview must go through this.
 */
export function getVSCodeApi<TState = unknown>(): VSCodeApi<TState> {
  if (api) return api as VSCodeApi<TState>;
  const acquire = (globalThis as { acquireVsCodeApi?: () => VSCodeApi })
    .acquireVsCodeApi;
  if (typeof acquire !== "function") {
    throw new Error(
      "acquireVsCodeApi is not defined: getVSCodeApi() must run inside a VS Code webview.",
    );
  }
  api = acquire();
  return api as VSCodeApi<TState>;
}
