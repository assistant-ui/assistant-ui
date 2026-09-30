import { createVSCodeStorage } from "@assistant-ui/vscode/webview";

/** Threads persist in the host's `globalState` through the bridge. */
export const threadStorage = createVSCodeStorage();

/** Each runtime stores its own threads, since their message formats differ. */
export const threadStoragePrefix = (runtime: string) =>
  `@assistant-ui:${runtime}:`;
