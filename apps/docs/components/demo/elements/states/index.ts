import type { ElementStates } from "./types";
import { GENERATIVE_STATES } from "./generative";
import { states as activityGraph } from "./activity-graph";
import { states as agentCard } from "./agent-card";
import { states as agentHandoff } from "./agent-handoff";
import { states as agentPlan } from "./agent-plan";
import { states as agentStatus } from "./agent-status";
import { states as approvalCard } from "./approval-card";
import { states as artifactCard } from "./artifact-card";
import { states as assistantModal } from "./assistant-modal";
import { states as assistantSidebar } from "./assistant-sidebar";
import { states as attachment } from "./attachment";
import { states as backgroundInbox } from "./background-inbox";
import { states as canvasSplit } from "./canvas-split";
import { states as chart } from "./chart";
import { states as chatPanel } from "./chat-panel";
import { states as checkpointHistory } from "./checkpoint-history";
import { states as codeDiff } from "./code-diff";
import { states as codeRunner } from "./code-runner";
import { states as commandPalette } from "./command-palette";
import { states as comparisonCard } from "./comparison-card";
import { states as composerAttachments } from "./composer-attachments";
import { states as composerContext } from "./composer-context";
import { states as composerMentions } from "./composer-mentions";
import { states as composerModelPicker } from "./composer-model-picker";
import { states as composerSlashCommands } from "./composer-slash-commands";
import { states as composerTriggerPopover } from "./composer-trigger-popover";
import { states as composerVoice } from "./composer-voice";
import { states as composer } from "./composer";
import { states as computerUse } from "./computer-use";
import { states as confidenceMarker } from "./confidence-marker";
import { states as connectionState } from "./connection-state";
import { states as contextBreakdown } from "./context-breakdown";
import { states as contextDisplay } from "./context-display";
import { states as conversationMap } from "./conversation-map";
import { states as conversationSearch } from "./conversation-search";
import { states as costMeter } from "./cost-meter";
import { states as dataTable } from "./data-table";
import { states as daySeparator } from "./day-separator";
import { states as diagram } from "./diagram";
import { states as directiveText } from "./directive-text";
import { states as documentReference } from "./document-reference";
import { states as draftRestore } from "./draft-restore";
import { states as editMessage } from "./edit-message";
import { states as elicitationForm } from "./elicitation-form";
import { states as emptyState } from "./empty-state";
import { states as errorState } from "./error-state";
import { states as feedbackDialog } from "./feedback-dialog";
import { states as fileTree } from "./file-tree";
import { states as file } from "./file";
import { states as flowGraph } from "./flow-graph";
import { states as followUpSuggestions } from "./follow-up-suggestions";
import { states as generativeUi } from "./generative-ui";
import { states as geoMap } from "./geo-map";
import { states as guardrailNotice } from "./guardrail-notice";
import { states as heatGraph } from "./heat-graph";
import { states as imageGallery } from "./image-gallery";
import { states as imageGeneration } from "./image-generation";
import { states as image } from "./image";
import { states as inlineCitation } from "./inline-citation";
import { states as jobProgress } from "./job-progress";
import { states as launcherBubble } from "./launcher-bubble";
import { states as linkPreview } from "./link-preview";
import { states as loadingState } from "./loading-state";
import { states as logos } from "./logos";
import { states as mapAnswer } from "./map-answer";
import { states as markdownText } from "./markdown-text";
import { states as mathBlock } from "./math-block";
import { states as mcpConfig } from "./mcp-config";
import { states as mcpServerPanel } from "./mcp-server-panel";
import { states as mediaPlayer } from "./media-player";
import { states as memoryChips } from "./memory-chips";
import { states as mermaidDiagram } from "./mermaid-diagram";
import { states as messageActions } from "./message-actions";
import { states as messageBranches } from "./message-branches";
import { states as messagePair } from "./message-pair";
import { states as messageQueue } from "./message-queue";
import { states as messageTiming } from "./message-timing";
import { states as mobileComposer } from "./mobile-composer";
import { states as modelSelector } from "./model-selector";
import { states as numberTicker } from "./number-ticker";
import { states as onboarding } from "./onboarding";
import { states as optionList } from "./option-list";
import { states as orb } from "./orb";
import { states as permissionGrant } from "./permission-grant";
import { states as promptLibrary } from "./prompt-library";
import { states as questionFlow } from "./question-flow";
import { states as quotaBanner } from "./quota-banner";
import { states as quote } from "./quote";
import { states as readAloud } from "./read-aloud";
import { states as reasoningEffort } from "./reasoning-effort";
import { states as reasoning } from "./reasoning";
import { states as recommendationCard } from "./recommendation-card";
import { states as regenerateMenu } from "./regenerate-menu";
import { states as researchReport } from "./research-report";
import { states as retrievalChunks } from "./retrieval-chunks";
import { states as reviewableDiff } from "./reviewable-diff";
import { states as runActivity } from "./run-activity";
import { states as scheduleCard } from "./schedule-card";
import { states as scoreBreakdown } from "./score-breakdown";
import { states as scrollAnchor } from "./scroll-anchor";
import { states as settingsPanel } from "./settings-panel";
import { states as sharedConversation } from "./shared-conversation";
import { states as shikiHighlighter } from "./shiki-highlighter";
import { states as sources } from "./sources";
import { states as speakerIdentity } from "./speaker-identity";
import { states as specSheet } from "./spec-sheet";
import { states as stoppedRun } from "./stopped-run";
import { states as streamingText } from "./streaming-text";
import { states as subagentList } from "./subagent-list";
import { states as syntaxHighlighter } from "./syntax-highlighter";
import { states as taskCard } from "./task-card";
import { states as terminalBlock } from "./terminal-block";
import { states as thinkingIndicator } from "./thinking-indicator";
import { states as threadListSidebar } from "./thread-list-sidebar";
import { states as threadList } from "./thread-list";
import { states as threadSearch } from "./thread-search";
import { states as thread } from "./thread";
import { states as timeline } from "./timeline";
import { states as todoList } from "./todo-list";
import { states as toolCall } from "./tool-call";
import { states as toolError } from "./tool-error";
import { states as toolFallback } from "./tool-fallback";
import { states as toolGroup } from "./tool-group";
import { states as toolTimeline } from "./tool-timeline";
import { states as tooltipIconButton } from "./tooltip-icon-button";
import { states as traceWaterfall } from "./trace-waterfall";
import { states as typingIndicator } from "./typing-indicator";
import { states as voiceConversation } from "./voice-conversation";
import { states as webPreview } from "./web-preview";
import { states as webSearch } from "./web-search";

/** Every catalog element's preview states, keyed by slug. `states.test.tsx` fails on a missing slug. */
export const ELEMENT_STATES: Record<string, ElementStates> = {
  "activity-graph": activityGraph,
  "agent-card": agentCard,
  "agent-handoff": agentHandoff,
  "agent-plan": agentPlan,
  "agent-status": agentStatus,
  "approval-card": approvalCard,
  "artifact-card": artifactCard,
  "assistant-modal": assistantModal,
  "assistant-sidebar": assistantSidebar,
  attachment: attachment,
  "background-inbox": backgroundInbox,
  "canvas-split": canvasSplit,
  chart: chart,
  "chat-panel": chatPanel,
  "checkpoint-history": checkpointHistory,
  "code-diff": codeDiff,
  "code-runner": codeRunner,
  "command-palette": commandPalette,
  "comparison-card": comparisonCard,
  "composer-attachments": composerAttachments,
  "composer-context": composerContext,
  "composer-mentions": composerMentions,
  "composer-model-picker": composerModelPicker,
  "composer-slash-commands": composerSlashCommands,
  "composer-trigger-popover": composerTriggerPopover,
  "composer-voice": composerVoice,
  composer: composer,
  "computer-use": computerUse,
  "confidence-marker": confidenceMarker,
  "connection-state": connectionState,
  "context-breakdown": contextBreakdown,
  "context-display": contextDisplay,
  "conversation-map": conversationMap,
  "conversation-search": conversationSearch,
  "cost-meter": costMeter,
  "data-table": dataTable,
  "day-separator": daySeparator,
  diagram: diagram,
  "directive-text": directiveText,
  "document-reference": documentReference,
  "draft-restore": draftRestore,
  "edit-message": editMessage,
  "elicitation-form": elicitationForm,
  "empty-state": emptyState,
  "error-state": errorState,
  "feedback-dialog": feedbackDialog,
  "file-tree": fileTree,
  file: file,
  "flow-graph": flowGraph,
  "follow-up-suggestions": followUpSuggestions,
  "generative-ui": generativeUi,
  "geo-map": geoMap,
  "guardrail-notice": guardrailNotice,
  "heat-graph": heatGraph,
  "image-gallery": imageGallery,
  "image-generation": imageGeneration,
  image: image,
  "inline-citation": inlineCitation,
  "job-progress": jobProgress,
  "launcher-bubble": launcherBubble,
  "link-preview": linkPreview,
  "loading-state": loadingState,
  logos: logos,
  "map-answer": mapAnswer,
  "markdown-text": markdownText,
  "math-block": mathBlock,
  "mcp-config": mcpConfig,
  "mcp-server-panel": mcpServerPanel,
  "media-player": mediaPlayer,
  "memory-chips": memoryChips,
  "mermaid-diagram": mermaidDiagram,
  "message-actions": messageActions,
  "message-branches": messageBranches,
  "message-pair": messagePair,
  "message-queue": messageQueue,
  "message-timing": messageTiming,
  "mobile-composer": mobileComposer,
  "model-selector": modelSelector,
  "number-ticker": numberTicker,
  onboarding: onboarding,
  "option-list": optionList,
  orb: orb,
  "permission-grant": permissionGrant,
  "prompt-library": promptLibrary,
  "question-flow": questionFlow,
  "quota-banner": quotaBanner,
  quote: quote,
  "read-aloud": readAloud,
  "reasoning-effort": reasoningEffort,
  reasoning: reasoning,
  "recommendation-card": recommendationCard,
  "regenerate-menu": regenerateMenu,
  "research-report": researchReport,
  "retrieval-chunks": retrievalChunks,
  "reviewable-diff": reviewableDiff,
  "run-activity": runActivity,
  "schedule-card": scheduleCard,
  "score-breakdown": scoreBreakdown,
  "scroll-anchor": scrollAnchor,
  "settings-panel": settingsPanel,
  "shared-conversation": sharedConversation,
  "shiki-highlighter": shikiHighlighter,
  sources: sources,
  "speaker-identity": speakerIdentity,
  "spec-sheet": specSheet,
  "stopped-run": stoppedRun,
  "streaming-text": streamingText,
  "subagent-list": subagentList,
  "syntax-highlighter": syntaxHighlighter,
  "task-card": taskCard,
  "terminal-block": terminalBlock,
  "thinking-indicator": thinkingIndicator,
  "thread-list-sidebar": threadListSidebar,
  "thread-list": threadList,
  "thread-search": threadSearch,
  thread: thread,
  timeline: timeline,
  "todo-list": todoList,
  "tool-call": toolCall,
  "tool-error": toolError,
  "tool-fallback": toolFallback,
  "tool-group": toolGroup,
  "tool-timeline": toolTimeline,
  "tooltip-icon-button": tooltipIconButton,
  "trace-waterfall": traceWaterfall,
  "typing-indicator": typingIndicator,
  "voice-conversation": voiceConversation,
  "web-preview": webPreview,
  "web-search": webSearch,
  ...GENERATIVE_STATES,
};

export function getElementStates(slug: string): ElementStates | undefined {
  return ELEMENT_STATES[slug];
}
