/**
 * Node-only entry: `@assistant-ui/react-pi/node`.
 *
 * This is the ONLY public entry that pulls in `@earendil-works/pi-coding-agent`
 * (via the supervisor). It is never imported by `index.ts`, so the browser
 * distribution stays free of Pi Node dependencies.
 *
 * Wire it up on the server: `const client = createPiNodeClient({ workspacePath })`,
 * then expose `client` over your transport (e.g. HTTP/SSE routes paired with
 * `createPiHttpClient`) or hand it straight to `usePiRuntime` in a
 * colocated/Electron setup.
 */
export {
  createPiNodeClient,
  getPiThreadSupervisor,
  type PiNodeClientOptions,
} from "./createPiNodeClient";
export {
  PiThreadSupervisor,
  type PiThreadSupervisorOptions,
} from "./PiThreadSupervisor";
export { PiUnsupportedHostUiError } from "./piNodeExtensionUi";

// Re-export the browser-safe transport contract so server code can build and
// type `PiClient` payloads without importing the main entry.
export * from "./piTypes";
