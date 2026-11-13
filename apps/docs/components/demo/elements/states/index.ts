import { GENERATIVE_ELEMENTS } from "@/lib/generative-elements";
import type { ElementStatesSource } from "./types";

type StatesLoader = () => Promise<ElementStatesSource>;

/**
 * Every handwritten element's preview states, keyed by slug. Each entry is its
 * own dynamic import, so an element page loads its own fixtures and nothing
 * else. `states.test.tsx` fails on a missing slug.
 */
const HANDWRITTEN_STATES: Record<string, StatesLoader> = {
  "activity-graph": () => import("./activity-graph").then((m) => m.states),
  "agent-card": () => import("./agent-card").then((m) => m.states),
  "agent-handoff": () => import("./agent-handoff").then((m) => m.states),
  "agent-plan": () => import("./agent-plan").then((m) => m.states),
  "agent-status": () => import("./agent-status").then((m) => m.states),
  "approval-card": () => import("./approval-card").then((m) => m.states),
  "artifact-card": () => import("./artifact-card").then((m) => m.states),
  "assistant-modal": () => import("./assistant-modal").then((m) => m.states),
  "assistant-sidebar": () =>
    import("./assistant-sidebar").then((m) => m.states),
  attachment: () => import("./attachment").then((m) => m.states),
  "background-inbox": () => import("./background-inbox").then((m) => m.states),
  "canvas-split": () => import("./canvas-split").then((m) => m.states),
  chart: () => import("./chart").then((m) => m.states),
  "chat-panel": () => import("./chat-panel").then((m) => m.states),
  "checkpoint-history": () =>
    import("./checkpoint-history").then((m) => m.states),
  "code-diff": () => import("./code-diff").then((m) => m.states),
  "code-runner": () => import("./code-runner").then((m) => m.states),
  "command-palette": () => import("./command-palette").then((m) => m.states),
  "comparison-card": () => import("./comparison-card").then((m) => m.states),
  "composer-attachments": () =>
    import("./composer-attachments").then((m) => m.states),
  "composer-context": () => import("./composer-context").then((m) => m.states),
  "composer-mentions": () =>
    import("./composer-mentions").then((m) => m.states),
  "composer-model-picker": () =>
    import("./composer-model-picker").then((m) => m.states),
  "composer-slash-commands": () =>
    import("./composer-slash-commands").then((m) => m.states),
  "composer-trigger-popover": () =>
    import("./composer-trigger-popover").then((m) => m.states),
  "composer-voice": () => import("./composer-voice").then((m) => m.states),
  composer: () => import("./composer").then((m) => m.states),
  "computer-use": () => import("./computer-use").then((m) => m.states),
  "confidence-marker": () =>
    import("./confidence-marker").then((m) => m.states),
  "connection-state": () => import("./connection-state").then((m) => m.states),
  "context-breakdown": () =>
    import("./context-breakdown").then((m) => m.states),
  "context-display": () => import("./context-display").then((m) => m.states),
  "conversation-map": () => import("./conversation-map").then((m) => m.states),
  "conversation-search": () =>
    import("./conversation-search").then((m) => m.states),
  "cost-meter": () => import("./cost-meter").then((m) => m.states),
  "data-table": () => import("./data-table").then((m) => m.states),
  "day-separator": () => import("./day-separator").then((m) => m.states),
  diagram: () => import("./diagram").then((m) => m.states),
  "directive-text": () => import("./directive-text").then((m) => m.states),
  "document-reference": () =>
    import("./document-reference").then((m) => m.states),
  "draft-restore": () => import("./draft-restore").then((m) => m.states),
  "edit-message": () => import("./edit-message").then((m) => m.states),
  "elicitation-form": () => import("./elicitation-form").then((m) => m.states),
  "empty-state": () => import("./empty-state").then((m) => m.states),
  "error-state": () => import("./error-state").then((m) => m.states),
  "feedback-dialog": () => import("./feedback-dialog").then((m) => m.states),
  "file-tree": () => import("./file-tree").then((m) => m.states),
  file: () => import("./file").then((m) => m.states),
  "flow-graph": () => import("./flow-graph").then((m) => m.states),
  "follow-up-suggestions": () =>
    import("./follow-up-suggestions").then((m) => m.states),
  "generative-ui": () => import("./generative-ui").then((m) => m.states),
  "geo-map": () => import("./geo-map").then((m) => m.states),
  "guardrail-notice": () => import("./guardrail-notice").then((m) => m.states),
  "heat-graph": () => import("./heat-graph").then((m) => m.states),
  "image-gallery": () => import("./image-gallery").then((m) => m.states),
  "image-generation": () => import("./image-generation").then((m) => m.states),
  image: () => import("./image").then((m) => m.states),
  "inline-citation": () => import("./inline-citation").then((m) => m.states),
  "job-progress": () => import("./job-progress").then((m) => m.states),
  "launcher-bubble": () => import("./launcher-bubble").then((m) => m.states),
  "link-preview": () => import("./link-preview").then((m) => m.states),
  "loading-state": () => import("./loading-state").then((m) => m.states),
  logos: () => import("./logos").then((m) => m.states),
  "map-answer": () => import("./map-answer").then((m) => m.states),
  "markdown-text": () => import("./markdown-text").then((m) => m.states),
  "math-block": () => import("./math-block").then((m) => m.states),
  "mcp-config": () => import("./mcp-config").then((m) => m.states),
  "mcp-server-panel": () => import("./mcp-server-panel").then((m) => m.states),
  "media-player": () => import("./media-player").then((m) => m.states),
  "memory-chips": () => import("./memory-chips").then((m) => m.states),
  "mermaid-diagram": () => import("./mermaid-diagram").then((m) => m.states),
  "message-actions": () => import("./message-actions").then((m) => m.states),
  "message-branches": () => import("./message-branches").then((m) => m.states),
  "message-pair": () => import("./message-pair").then((m) => m.states),
  "message-queue": () => import("./message-queue").then((m) => m.states),
  "message-timing": () => import("./message-timing").then((m) => m.states),
  "mobile-composer": () => import("./mobile-composer").then((m) => m.states),
  "model-selector": () => import("./model-selector").then((m) => m.states),
  "number-ticker": () => import("./number-ticker").then((m) => m.states),
  onboarding: () => import("./onboarding").then((m) => m.states),
  "option-list": () => import("./option-list").then((m) => m.states),
  orb: () => import("./orb").then((m) => m.states),
  "permission-grant": () => import("./permission-grant").then((m) => m.states),
  "prompt-library": () => import("./prompt-library").then((m) => m.states),
  "question-flow": () => import("./question-flow").then((m) => m.states),
  "quota-banner": () => import("./quota-banner").then((m) => m.states),
  quote: () => import("./quote").then((m) => m.states),
  "read-aloud": () => import("./read-aloud").then((m) => m.states),
  "reasoning-effort": () => import("./reasoning-effort").then((m) => m.states),
  reasoning: () => import("./reasoning").then((m) => m.states),
  "recommendation-card": () =>
    import("./recommendation-card").then((m) => m.states),
  "regenerate-menu": () => import("./regenerate-menu").then((m) => m.states),
  "research-report": () => import("./research-report").then((m) => m.states),
  "retrieval-chunks": () => import("./retrieval-chunks").then((m) => m.states),
  "reviewable-diff": () => import("./reviewable-diff").then((m) => m.states),
  "run-activity": () => import("./run-activity").then((m) => m.states),
  "schedule-card": () => import("./schedule-card").then((m) => m.states),
  "score-breakdown": () => import("./score-breakdown").then((m) => m.states),
  "scroll-anchor": () => import("./scroll-anchor").then((m) => m.states),
  "settings-panel": () => import("./settings-panel").then((m) => m.states),
  "shared-conversation": () =>
    import("./shared-conversation").then((m) => m.states),
  "shiki-highlighter": () =>
    import("./shiki-highlighter").then((m) => m.states),
  sources: () => import("./sources").then((m) => m.states),
  "speaker-identity": () => import("./speaker-identity").then((m) => m.states),
  "spec-sheet": () => import("./spec-sheet").then((m) => m.states),
  "stopped-run": () => import("./stopped-run").then((m) => m.states),
  "streaming-text": () => import("./streaming-text").then((m) => m.states),
  "subagent-list": () => import("./subagent-list").then((m) => m.states),
  "syntax-highlighter": () =>
    import("./syntax-highlighter").then((m) => m.states),
  "task-card": () => import("./task-card").then((m) => m.states),
  "terminal-block": () => import("./terminal-block").then((m) => m.states),
  "thinking-indicator": () =>
    import("./thinking-indicator").then((m) => m.states),
  "thread-list-sidebar": () =>
    import("./thread-list-sidebar").then((m) => m.states),
  "thread-list": () => import("./thread-list").then((m) => m.states),
  "thread-search": () => import("./thread-search").then((m) => m.states),
  thread: () => import("./thread").then((m) => m.states),
  timeline: () => import("./timeline").then((m) => m.states),
  "todo-list": () => import("./todo-list").then((m) => m.states),
  "tool-call": () => import("./tool-call").then((m) => m.states),
  "tool-error": () => import("./tool-error").then((m) => m.states),
  "tool-fallback": () => import("./tool-fallback").then((m) => m.states),
  "tool-group": () => import("./tool-group").then((m) => m.states),
  "tool-timeline": () => import("./tool-timeline").then((m) => m.states),
  "tooltip-icon-button": () =>
    import("./tooltip-icon-button").then((m) => m.states),
  "trace-waterfall": () => import("./trace-waterfall").then((m) => m.states),
  "typing-indicator": () => import("./typing-indicator").then((m) => m.states),
  "voice-conversation": () =>
    import("./voice-conversation").then((m) => m.states),
  "web-preview": () => import("./web-preview").then((m) => m.states),
  "web-search": () => import("./web-search").then((m) => m.states),
};

// The generative templates share one module, so their loader hands over the
// whole map and the preview picks its slug on the client.
const loadGenerativeStates: StatesLoader = () =>
  import("./generative").then((m) => m.GENERATIVE_STATES);

/**
 * Elements whose states hold only `default`, so the preview shows no switcher.
 * The preview reads this before their states load, so it does not hold an
 * empty switcher row for them. `states.test.tsx` keeps it in sync.
 */
export const DEFAULT_ONLY_STATE_SLUGS: ReadonlySet<string> = new Set([
  "mcp-config",
  "typing-indicator",
]);

export const ELEMENT_STATES: Record<string, StatesLoader> = {
  ...HANDWRITTEN_STATES,
  ...Object.fromEntries(
    GENERATIVE_ELEMENTS.map((entry) => [entry.slug, loadGenerativeStates]),
  ),
};

/** Loads an element's states, for `ElementStatesPreview`'s `states` prop. */
export function loadElementStates(
  slug: string,
): Promise<ElementStatesSource> | undefined {
  return ELEMENT_STATES[slug]?.();
}
