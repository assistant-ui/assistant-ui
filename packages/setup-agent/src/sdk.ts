/**
 * The setup SDK: everything a CLI needs to embed `<tool> setup` for coding
 * agents. `runAgentSetup` is the whole command; the pieces below it start a
 * session, follow it as a stream, decide when to open the browser, and answer
 * from the agent's side. Node only; the browser-safe protocol is `setup-agent`.
 */
export { runAgentSetup, setupBriefing } from "./embed";
export type { RunAgentSetupOptions, SetupBriefingOptions } from "./embed";
export {
  createSetupId,
  openUrl,
  setupPageUrl,
  startSetupSession,
} from "./session";
export type { SetupSession, StartSetupSessionOptions } from "./session";
export { diffEvents, followSetup, gateEvent } from "./stream";
export type { FollowSetupOptions, SetupStream, StreamEvent } from "./stream";
export {
  BROWSER_CLOSE_GRACE_MS,
  BROWSER_REOPEN_GUARD_MS,
  createBrowserGate,
} from "./browser";
export type {
  AskReason,
  BrowserGate,
  BrowserGateAction,
  BrowserGateOptions,
} from "./browser";
export {
  answerNeed,
  formatTerminalQuestion,
  needKey,
  pendingNeeds,
  terminalQuestion,
  wireAnswer,
} from "./needs";
export type {
  AnswerOptions,
  AnswerResult,
  NeedOption,
  SetupNeed,
  TerminalQuestion,
} from "./needs";
export { agentInstructions, parseSetupUrl, runSetupCommand } from "./cli";
export type { AgentInstructionsOptions, RunSetupCommandOptions } from "./cli";
export { connectCheckout } from "./client";
export type { CheckoutClient } from "./client";
