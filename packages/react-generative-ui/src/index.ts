// `JSONGenerativeUI` is the one export that differs per build: it comes from the
// `./internal-json` subpath, which resolves to the server variant (schema only)
// under the `react-server` condition and the client variant (adds render/execute)
// otherwise. Everything else here is isomorphic, so this single entry serves
// both conditions — no per-build index barrel needed.
export { JSONGenerativeUI } from "@assistant-ui/react-generative-ui/internal-json";
export { renderGenerativeUI } from "./renderGenerativeUI";
export { generativeUIToJSX } from "./generativeUIToJSX";
export { buildPresentParameters } from "./buildPresentParameters";
export { defineGenerativeComponents } from "./defineGenerativeComponents";
export { TYPE_KEY } from "./constants";
export type {
  JSONGenerativeUIOptions,
  PresentTool,
  PresentToolOptions,
  PromptUserTool,
} from "./JSONGenerativeUI.shared";
export type {
  GenerativeUILibrary,
  GenerativeUIComponent,
  GenerativeUIElement,
  GenerativeUIProps,
  GenerativeUINode,
  GenerativeUIStatus,
  GenerativeUIRenderContext,
} from "./types";
