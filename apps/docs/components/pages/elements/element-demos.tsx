"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { GENERATIVE_ELEMENTS } from "@/lib/generative-elements";

/**
 * Every element demo, keyed by slug, and each variant by `slug/variant-key`.
 * Each entry is its own `next/dynamic` import, so a page bundles only the demos
 * it renders and still server-renders them. A server-side map would not split:
 * Turbopack puts every client module a page can reach into that page's chunks.
 * `element-demos.test.tsx` fails on a missing or stray key.
 */
const HANDWRITTEN_DEMOS: Record<string, ComponentType> = {
  "loading-state": dynamic(() =>
    import("@/components/demo/elements/loading-state").then(
      (m) => m.GenerationLoaderDemo,
    ),
  ),
  "loading-state/dots": dynamic(() =>
    import("@/components/demo/elements/loading-state").then(
      (m) => m.GenerationLoaderDemo,
    ),
  ),
  "loading-state/squares": dynamic(() =>
    import("@/components/demo/elements/loading-state").then(
      (m) => m.GenerationLoaderSquaresDemo,
    ),
  ),
  "loading-state/rounded": dynamic(() =>
    import("@/components/demo/elements/loading-state").then(
      (m) => m.GenerationLoaderRoundedDemo,
    ),
  ),
  "thinking-indicator": dynamic(() =>
    import("@/components/demo/elements/thinking-indicator").then(
      (m) => m.ThinkingIndicatorDemo,
    ),
  ),
  "streaming-text": dynamic(() =>
    import("@/components/demo/elements/streaming-text").then(
      (m) => m.StreamingTextDemo,
    ),
  ),
  "typing-indicator": dynamic(() =>
    import("@/components/demo/elements/typing-indicator").then(
      (m) => m.TypingIndicatorDemo,
    ),
  ),
  "typing-indicator/bubble": dynamic(() =>
    import("@/components/demo/elements/typing-indicator").then(
      (m) => m.TypingIndicatorDemo,
    ),
  ),
  "typing-indicator/bare": dynamic(() =>
    import("@/components/demo/elements/typing-indicator").then(
      (m) => m.TypingIndicatorBareDemo,
    ),
  ),
  "reasoning-effort": dynamic(() =>
    import("@/components/demo/elements/reasoning-effort").then(
      (m) => m.ReasoningEffortDemo,
    ),
  ),
  "guardrail-notice": dynamic(() =>
    import("@/components/demo/elements/guardrail-notice").then(
      (m) => m.GuardrailNoticeDemo,
    ),
  ),
  "message-pair": dynamic(() =>
    import("@/components/demo/elements/message-pair").then(
      (m) => m.MessagePairDemo,
    ),
  ),
  "message-pair/bubble": dynamic(() =>
    import("@/components/demo/elements/message-pair").then(
      (m) => m.MessagePairDemo,
    ),
  ),
  "message-pair/flat": dynamic(() =>
    import("@/components/demo/elements/message-pair").then(
      (m) => m.MessagePairFlatDemo,
    ),
  ),
  "message-branches": dynamic(() =>
    import("@/components/demo/elements/message-branches").then(
      (m) => m.MessageBranchesDemo,
    ),
  ),
  "message-actions": dynamic(() =>
    import("@/components/demo/elements/message-actions").then(
      (m) => m.MessageActionsDemo,
    ),
  ),
  "error-state": dynamic(() =>
    import("@/components/demo/elements/error-state").then(
      (m) => m.ErrorStateDemo,
    ),
  ),
  "message-queue": dynamic(() =>
    import("@/components/demo/elements/message-queue").then(
      (m) => m.MessageQueueDemo,
    ),
  ),
  "edit-message": dynamic(() =>
    import("@/components/demo/elements/edit-message").then(
      (m) => m.EditMessageDemo,
    ),
  ),
  "feedback-dialog": dynamic(() =>
    import("@/components/demo/elements/feedback-dialog").then(
      (m) => m.FeedbackDialogDemo,
    ),
  ),
  "stopped-run": dynamic(() =>
    import("@/components/demo/elements/stopped-run").then(
      (m) => m.StoppedRunDemo,
    ),
  ),
  "day-separator": dynamic(() =>
    import("@/components/demo/elements/day-separator").then(
      (m) => m.DaySeparatorDemo,
    ),
  ),
  "speaker-identity": dynamic(() =>
    import("@/components/demo/elements/speaker-identity").then(
      (m) => m.SpeakerIdentityDemo,
    ),
  ),
  "regenerate-menu": dynamic(() =>
    import("@/components/demo/elements/regenerate-menu").then(
      (m) => m.RegenerateMenuDemo,
    ),
  ),
  "confidence-marker": dynamic(() =>
    import("@/components/demo/elements/confidence-marker").then(
      (m) => m.ConfidenceMarkerDemo,
    ),
  ),
  "tool-call": dynamic(() =>
    import("@/components/demo/elements/tool-call").then((m) => m.ToolCallDemo),
  ),
  "run-activity": dynamic(() =>
    import("@/components/demo/elements/run-activity").then(
      (m) => m.RunActivityDemo,
    ),
  ),
  "tool-timeline": dynamic(() =>
    import("@/components/demo/elements/tool-timeline").then(
      (m) => m.ToolTimelineDemo,
    ),
  ),
  "terminal-block": dynamic(() =>
    import("@/components/demo/elements/terminal-block").then(
      (m) => m.TerminalBlockDemo,
    ),
  ),
  "terminal-block/paper": dynamic(() =>
    import("@/components/demo/elements/terminal-block").then(
      (m) => m.TerminalBlockDemo,
    ),
  ),
  "terminal-block/ink": dynamic(() =>
    import("@/components/demo/elements/terminal-block").then(
      (m) => m.TerminalBlockInkDemo,
    ),
  ),
  "terminal-block/failed": dynamic(() =>
    import("@/components/demo/elements/terminal-block").then(
      (m) => m.TerminalBlockFailedDemo,
    ),
  ),
  "code-diff": dynamic(() =>
    import("@/components/demo/elements/code-diff").then((m) => m.CodeDiffDemo),
  ),
  "reviewable-diff": dynamic(() =>
    import("@/components/demo/elements/reviewable-diff").then(
      (m) => m.ReviewableDiffDemo,
    ),
  ),
  "file-tree": dynamic(() =>
    import("@/components/demo/elements/file-tree").then((m) => m.FileTreeDemo),
  ),
  "elicitation-form": dynamic(() =>
    import("@/components/demo/elements/elicitation-form").then(
      (m) => m.ElicitationFormDemo,
    ),
  ),
  "mcp-server-panel": dynamic(() =>
    import("@/components/demo/elements/mcp-server-panel").then(
      (m) => m.McpServerPanelDemo,
    ),
  ),
  "tool-error": dynamic(() =>
    import("@/components/demo/elements/tool-error").then(
      (m) => m.ToolErrorDemo,
    ),
  ),
  "permission-grant": dynamic(() =>
    import("@/components/demo/elements/permission-grant").then(
      (m) => m.PermissionGrantDemo,
    ),
  ),
  "computer-use": dynamic(() =>
    import("@/components/demo/elements/computer-use").then(
      (m) => m.ComputerUseDemo,
    ),
  ),
  "code-runner": dynamic(() =>
    import("@/components/demo/elements/code-runner").then(
      (m) => m.CodeRunnerDemo,
    ),
  ),
  "web-search": dynamic(() =>
    import("@/components/demo/elements/web-search").then(
      (m) => m.WebSearchDemo,
    ),
  ),
  "inline-citation": dynamic(() =>
    import("@/components/demo/elements/inline-citation").then(
      (m) => m.InlineCitationDemo,
    ),
  ),
  "link-preview": dynamic(() =>
    import("@/components/demo/elements/link-preview").then(
      (m) => m.LinkPreviewDemo,
    ),
  ),
  "link-preview/card": dynamic(() =>
    import("@/components/demo/elements/link-preview").then(
      (m) => m.LinkPreviewDemo,
    ),
  ),
  "link-preview/compact": dynamic(() =>
    import("@/components/demo/elements/link-preview").then(
      (m) => m.LinkPreviewCompactDemo,
    ),
  ),
  "image-generation": dynamic(() =>
    import("@/components/demo/elements/image-generation").then(
      (m) => m.ImageGenerationDemo,
    ),
  ),
  "image-gallery": dynamic(() =>
    import("@/components/demo/elements/image-gallery").then(
      (m) => m.ImageGalleryDemo,
    ),
  ),
  "retrieval-chunks": dynamic(() =>
    import("@/components/demo/elements/retrieval-chunks").then(
      (m) => m.RetrievalChunksDemo,
    ),
  ),
  "document-reference": dynamic(() =>
    import("@/components/demo/elements/document-reference").then(
      (m) => m.DocumentReferenceDemo,
    ),
  ),
  "memory-chips": dynamic(() =>
    import("@/components/demo/elements/memory-chips").then(
      (m) => m.MemoryChipsDemo,
    ),
  ),
  "research-report": dynamic(() =>
    import("@/components/demo/elements/research-report").then(
      (m) => m.ResearchReportDemo,
    ),
  ),
  "map-answer": dynamic(() =>
    import("@/components/demo/elements/map-answer").then(
      (m) => m.MapAnswerDemo,
    ),
  ),
  "geo-map": dynamic(() =>
    import("@/components/demo/elements/geo-map").then((m) => m.GeoMapDemo),
  ),
  "data-table": dynamic(() =>
    import("@/components/demo/elements/data-table").then(
      (m) => m.DataTableDemo,
    ),
  ),
  "number-ticker": dynamic(() =>
    import("@/components/demo/elements/number-ticker").then(
      (m) => m.NumberTickerDemo,
    ),
  ),
  chart: dynamic(() =>
    import("@/components/demo/elements/chart").then((m) => m.ChartDemo),
  ),
  "chart/area": dynamic(() =>
    import("@/components/demo/elements/chart").then((m) => m.ChartDemo),
  ),
  "chart/line": dynamic(() =>
    import("@/components/demo/elements/chart").then((m) => m.ChartLineDemo),
  ),
  "chart/bars": dynamic(() =>
    import("@/components/demo/elements/chart").then((m) => m.ChartBarsDemo),
  ),
  "media-player": dynamic(() =>
    import("@/components/demo/elements/media-player").then(
      (m) => m.AudioPlayerDemo,
    ),
  ),
  "media-player/audio": dynamic(() =>
    import("@/components/demo/elements/media-player").then(
      (m) => m.AudioPlayerDemo,
    ),
  ),
  "media-player/video": dynamic(() =>
    import("@/components/demo/elements/media-player").then(
      (m) => m.VideoPlayerDemo,
    ),
  ),
  "web-preview": dynamic(() =>
    import("@/components/demo/elements/web-preview").then(
      (m) => m.WebPreviewDemo,
    ),
  ),
  diagram: dynamic(() =>
    import("@/components/demo/elements/diagram").then((m) => m.DiagramDemo),
  ),
  "flow-graph": dynamic(() =>
    import("@/components/demo/elements/flow-graph").then(
      (m) => m.FlowGraphDemo,
    ),
  ),
  "activity-graph": dynamic(() =>
    import("@/components/demo/elements/activity-graph").then(
      (m) => m.ActivityGraphDemo,
    ),
  ),
  "math-block": dynamic(() =>
    import("@/components/demo/elements/math-block").then(
      (m) => m.MathBlockDemo,
    ),
  ),
  "spec-sheet": dynamic(() =>
    import("@/components/demo/elements/spec-sheet").then(
      (m) => m.SpecSheetDemo,
    ),
  ),
  "comparison-card": dynamic(() =>
    import("@/components/demo/elements/comparison-card").then(
      (m) => m.ComparisonCardDemo,
    ),
  ),
  timeline: dynamic(() =>
    import("@/components/demo/elements/timeline").then((m) => m.TimelineDemo),
  ),
  "job-progress": dynamic(() =>
    import("@/components/demo/elements/job-progress").then(
      (m) => m.JobProgressDemo,
    ),
  ),
  "score-breakdown": dynamic(() =>
    import("@/components/demo/elements/score-breakdown").then(
      (m) => m.ScoreBreakdownDemo,
    ),
  ),
  "agent-plan": dynamic(() =>
    import("@/components/demo/elements/agent-plan").then(
      (m) => m.AgentPlanDemo,
    ),
  ),
  "subagent-list": dynamic(() =>
    import("@/components/demo/elements/subagent-list").then(
      (m) => m.SubagentListDemo,
    ),
  ),
  "task-card": dynamic(() =>
    import("@/components/demo/elements/task-card").then((m) => m.TaskCardDemo),
  ),
  "agent-status": dynamic(() =>
    import("@/components/demo/elements/agent-status").then(
      (m) => m.AgentStatusDemo,
    ),
  ),
  "approval-card": dynamic(() =>
    import("@/components/demo/elements/approval-card").then(
      (m) => m.ApprovalCardDemo,
    ),
  ),
  "approval-card/command": dynamic(() =>
    import("@/components/demo/elements/approval-card").then(
      (m) => m.ApprovalCardDemo,
    ),
  ),
  "approval-card/destructive": dynamic(() =>
    import("@/components/demo/elements/approval-card").then(
      (m) => m.ApprovalCardDestructiveDemo,
    ),
  ),
  "option-list": dynamic(() =>
    import("@/components/demo/elements/option-list").then(
      (m) => m.OptionListDemo,
    ),
  ),
  "option-list/single": dynamic(() =>
    import("@/components/demo/elements/option-list").then(
      (m) => m.OptionListDemo,
    ),
  ),
  "option-list/multiple": dynamic(() =>
    import("@/components/demo/elements/option-list").then(
      (m) => m.OptionListMultipleDemo,
    ),
  ),
  "question-flow": dynamic(() =>
    import("@/components/demo/elements/question-flow").then(
      (m) => m.QuestionFlowDemo,
    ),
  ),
  "recommendation-card": dynamic(() =>
    import("@/components/demo/elements/recommendation-card").then(
      (m) => m.RecommendationCardDemo,
    ),
  ),
  "artifact-card": dynamic(() =>
    import("@/components/demo/elements/artifact-card").then(
      (m) => m.ArtifactCardDemo,
    ),
  ),
  "todo-list": dynamic(() =>
    import("@/components/demo/elements/todo-list").then((m) => m.TodoListDemo),
  ),
  "agent-card": dynamic(() =>
    import("@/components/demo/elements/agent-card").then(
      (m) => m.AgentCardDemo,
    ),
  ),
  "agent-handoff": dynamic(() =>
    import("@/components/demo/elements/agent-handoff").then(
      (m) => m.AgentHandoffDemo,
    ),
  ),
  "background-inbox": dynamic(() =>
    import("@/components/demo/elements/background-inbox").then(
      (m) => m.BackgroundInboxDemo,
    ),
  ),
  "checkpoint-history": dynamic(() =>
    import("@/components/demo/elements/checkpoint-history").then(
      (m) => m.CheckpointHistoryDemo,
    ),
  ),
  "schedule-card": dynamic(() =>
    import("@/components/demo/elements/schedule-card").then(
      (m) => m.ScheduleCardDemo,
    ),
  ),
  "trace-waterfall": dynamic(() =>
    import("@/components/demo/elements/trace-waterfall").then(
      (m) => m.TraceWaterfallDemo,
    ),
  ),
  "cost-meter": dynamic(() =>
    import("@/components/demo/elements/cost-meter").then(
      (m) => m.CostMeterDemo,
    ),
  ),
  "quota-banner": dynamic(() =>
    import("@/components/demo/elements/quota-banner").then(
      (m) => m.QuotaBannerDemo,
    ),
  ),
  composer: dynamic(() =>
    import("@/components/demo/elements/composer").then((m) => m.ComposerDemo),
  ),
  "composer-slash-commands": dynamic(() =>
    import("@/components/demo/elements/composer-slash").then(
      (m) => m.ComposerSlashDemo,
    ),
  ),
  "composer-mentions": dynamic(() =>
    import("@/components/demo/elements/composer-mentions").then(
      (m) => m.ComposerMentionsDemo,
    ),
  ),
  "composer-attachments": dynamic(() =>
    import("@/components/demo/elements/composer-attachments").then(
      (m) => m.ComposerAttachmentsDemo,
    ),
  ),
  "composer-model-picker": dynamic(() =>
    import("@/components/demo/elements/composer-models").then(
      (m) => m.ComposerModelsDemo,
    ),
  ),
  "composer-voice": dynamic(() =>
    import("@/components/demo/elements/composer-voice").then(
      (m) => m.ComposerVoiceDemo,
    ),
  ),
  "composer-context": dynamic(() =>
    import("@/components/demo/elements/composer-context").then(
      (m) => m.ComposerContextDemo,
    ),
  ),
  "draft-restore": dynamic(() =>
    import("@/components/demo/elements/draft-restore").then(
      (m) => m.DraftRestoreDemo,
    ),
  ),
  "context-breakdown": dynamic(() =>
    import("@/components/demo/elements/context-breakdown").then(
      (m) => m.ContextBreakdownDemo,
    ),
  ),
  "prompt-library": dynamic(() =>
    import("@/components/demo/elements/prompt-library").then(
      (m) => m.PromptLibraryDemo,
    ),
  ),
  "command-palette": dynamic(() =>
    import("@/components/demo/elements/command-palette").then(
      (m) => m.CommandPaletteDemo,
    ),
  ),
  "voice-conversation": dynamic(() =>
    import("@/components/demo/elements/voice-conversation").then(
      (m) => m.VoiceConversationDemo,
    ),
  ),
  "read-aloud": dynamic(() =>
    import("@/components/demo/elements/read-aloud").then(
      (m) => m.ReadAloudDemo,
    ),
  ),
  "chat-panel": dynamic(() =>
    import("@/components/demo/elements/chat-panel").then(
      (m) => m.ChatPanelDemo,
    ),
  ),
  "empty-state": dynamic(() =>
    import("@/components/demo/elements/empty-state").then(
      (m) => m.EmptyStateDemo,
    ),
  ),
  "scroll-anchor": dynamic(() =>
    import("@/components/demo/elements/scroll-anchor").then(
      (m) => m.ScrollAnchorDemo,
    ),
  ),
  "canvas-split": dynamic(() =>
    import("@/components/demo/elements/canvas-split").then(
      (m) => m.CanvasSplitDemo,
    ),
  ),
  "connection-state": dynamic(() =>
    import("@/components/demo/elements/connection-state").then(
      (m) => m.ConnectionStateDemo,
    ),
  ),
  "shared-conversation": dynamic(() =>
    import("@/components/demo/elements/shared-conversation").then(
      (m) => m.SharedConversationDemo,
    ),
  ),
  "conversation-search": dynamic(() =>
    import("@/components/demo/elements/conversation-search").then(
      (m) => m.ConversationSearchDemo,
    ),
  ),
  "thread-search": dynamic(() =>
    import("@/components/demo/elements/thread-search").then(
      (m) => m.ThreadSearchDemo,
    ),
  ),
  "launcher-bubble": dynamic(() =>
    import("@/components/demo/elements/launcher-bubble").then(
      (m) => m.LauncherBubbleDemo,
    ),
  ),
  "settings-panel": dynamic(() =>
    import("@/components/demo/elements/settings-panel").then(
      (m) => m.SettingsPanelDemo,
    ),
  ),
  onboarding: dynamic(() =>
    import("@/components/demo/elements/onboarding").then(
      (m) => m.OnboardingDemo,
    ),
  ),
  "mobile-composer": dynamic(() =>
    import("@/components/demo/elements/mobile-composer").then(
      (m) => m.MobileComposerDemo,
    ),
  ),
  thread: dynamic(() =>
    import("@/components/demo/elements/aui/thread").then(
      (m) => m.AuiThreadDemo,
    ),
  ),
  "assistant-modal": dynamic(() =>
    import("@/components/demo/elements/aui/assistant-modal").then(
      (m) => m.AuiAssistantModalDemo,
    ),
  ),
  "assistant-sidebar": dynamic(() =>
    import("@/components/demo/elements/aui/assistant-sidebar").then(
      (m) => m.AuiAssistantSidebarDemo,
    ),
  ),
  "thread-list": dynamic(() =>
    import("@/components/demo/elements/aui/thread-list").then(
      (m) => m.AuiThreadListDemo,
    ),
  ),
  "thread-list/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/thread-list").then(
      (m) => m.AuiThreadListDemo,
    ),
  ),
  "thread-list/static": dynamic(() =>
    import("@/components/demo/elements/thread-list").then(
      (m) => m.ThreadListDemo,
    ),
  ),
  "thread-list-sidebar": dynamic(() =>
    import("@/components/demo/elements/aui/thread-list-sidebar").then(
      (m) => m.AuiThreadListSidebarDemo,
    ),
  ),
  orb: dynamic(() =>
    import("@/components/demo/elements/aui/voice").then((m) => m.AuiVoiceDemo),
  ),
  "orb/session": dynamic(() =>
    import("@/components/demo/elements/aui/voice").then((m) => m.AuiVoiceDemo),
  ),
  "orb/states": dynamic(() =>
    import("@/components/demo/elements/aui/voice-states").then(
      (m) => m.AuiVoiceStatesDemo,
    ),
  ),
  "orb/palettes": dynamic(() =>
    import("@/components/demo/elements/aui/voice-palettes").then(
      (m) => m.AuiVoicePalettesDemo,
    ),
  ),
  reasoning: dynamic(() =>
    import("@/components/demo/elements/aui/reasoning").then(
      (m) => m.AuiReasoningDemo,
    ),
  ),
  "reasoning/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/reasoning").then(
      (m) => m.AuiReasoningDemo,
    ),
  ),
  "reasoning/static": dynamic(() =>
    import("@/components/demo/elements/reasoning-panel").then(
      (m) => m.ReasoningPanelDemo,
    ),
  ),
  "message-timing": dynamic(() =>
    import("@/components/demo/elements/aui/message-timing").then(
      (m) => m.AuiMessageTimingDemo,
    ),
  ),
  "message-timing/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/message-timing").then(
      (m) => m.AuiMessageTimingDemo,
    ),
  ),
  "message-timing/static": dynamic(() =>
    import("@/components/demo/elements/message-timing").then(
      (m) => m.MessageTimingDemo,
    ),
  ),
  "conversation-map": dynamic(() =>
    import("@/components/demo/elements/aui/conversation-map").then(
      (m) => m.AuiConversationMapDemo,
    ),
  ),
  "conversation-map/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/conversation-map").then(
      (m) => m.AuiConversationMapDemo,
    ),
  ),
  "conversation-map/static": dynamic(() =>
    import("@/components/demo/elements/conversation-map").then(
      (m) => m.ConversationMapDemo,
    ),
  ),
  "context-display": dynamic(() =>
    import("@/components/demo/elements/aui/context-display").then(
      (m) => m.AuiContextDisplayDemo,
    ),
  ),
  "mcp-config": dynamic(() =>
    import("@/components/demo/elements/aui/mcp-config").then(
      (m) => m.AuiMcpConfigDemo,
    ),
  ),
  attachment: dynamic(() =>
    import("@/components/demo/elements/aui/attachment").then(
      (m) => m.AuiAttachmentDemo,
    ),
  ),
  "attachment/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/attachment").then(
      (m) => m.AuiAttachmentDemo,
    ),
  ),
  "attachment/static": dynamic(() =>
    import("@/components/demo/elements/message-attachment").then(
      (m) => m.MessageAttachmentDemo,
    ),
  ),
  "follow-up-suggestions": dynamic(() =>
    import("@/components/demo/elements/aui/follow-up-suggestions").then(
      (m) => m.AuiFollowUpSuggestionsDemo,
    ),
  ),
  "follow-up-suggestions/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/follow-up-suggestions").then(
      (m) => m.AuiFollowUpSuggestionsDemo,
    ),
  ),
  "follow-up-suggestions/pills": dynamic(() =>
    import("@/components/demo/elements/suggestions").then(
      (m) => m.SuggestionsDemo,
    ),
  ),
  "follow-up-suggestions/list": dynamic(() =>
    import("@/components/demo/elements/suggestions").then(
      (m) => m.SuggestionsListDemo,
    ),
  ),
  "tool-fallback": dynamic(() =>
    import("@/components/demo/elements/aui/tool-fallback").then(
      (m) => m.AuiToolFallbackDemo,
    ),
  ),
  "tool-fallback/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/tool-fallback").then(
      (m) => m.AuiToolFallbackDemo,
    ),
  ),
  "tool-fallback/receipt": dynamic(() =>
    import("@/components/demo/elements/aui/tool-fallback-receipt").then(
      (m) => m.AuiToolFallbackReceiptDemo,
    ),
  ),
  "tool-group": dynamic(() =>
    import("@/components/demo/elements/aui/tool-group").then(
      (m) => m.AuiToolGroupDemo,
    ),
  ),
  "tool-group/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/tool-group").then(
      (m) => m.AuiToolGroupDemo,
    ),
  ),
  "tool-group/static": dynamic(() =>
    import("@/components/demo/elements/tool-group").then(
      (m) => m.ToolGroupDemo,
    ),
  ),
  quote: dynamic(() =>
    import("@/components/demo/elements/aui/quote").then((m) => m.AuiQuoteDemo),
  ),
  "quote/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/quote").then((m) => m.AuiQuoteDemo),
  ),
  "quote/static": dynamic(() =>
    import("@/components/demo/elements/quote-reply").then(
      (m) => m.QuoteReplyDemo,
    ),
  ),
  sources: dynamic(() =>
    import("@/components/demo/elements/aui/sources").then(
      (m) => m.AuiSourcesDemo,
    ),
  ),
  "sources/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/sources").then(
      (m) => m.AuiSourcesDemo,
    ),
  ),
  "sources/variants": dynamic(() =>
    import("@/components/demo/elements/aui/sources-variants").then(
      (m) => m.AuiSourcesVariantsDemo,
    ),
  ),
  "sources/static": dynamic(() =>
    import("@/components/demo/elements/sources").then((m) => m.SourcesDemo),
  ),
  image: dynamic(() =>
    import("@/components/demo/elements/aui/image").then((m) => m.AuiImageDemo),
  ),
  file: dynamic(() =>
    import("@/components/demo/elements/aui/file").then((m) => m.AuiFileDemo),
  ),
  "model-selector": dynamic(() =>
    import("@/components/demo/elements/aui/model-selector").then(
      (m) => m.AuiModelSelectorDemo,
    ),
  ),
  "model-selector/runtime": dynamic(() =>
    import("@/components/demo/elements/aui/model-selector").then(
      (m) => m.AuiModelSelectorDemo,
    ),
  ),
  "model-selector/static": dynamic(() =>
    import("@/components/demo/elements/model-picker").then(
      (m) => m.ModelPickerDemo,
    ),
  ),
  "composer-trigger-popover": dynamic(() =>
    import("@/components/demo/elements/aui/composer-trigger-popover").then(
      (m) => m.AuiComposerTriggerPopoverDemo,
    ),
  ),
  "directive-text": dynamic(() =>
    import("@/components/demo/elements/aui/directive-text").then(
      (m) => m.AuiDirectiveTextDemo,
    ),
  ),
  "markdown-text": dynamic(() =>
    import("@/components/demo/elements/aui/markdown-text").then(
      (m) => m.AuiMarkdownTextDemo,
    ),
  ),
  "syntax-highlighter": dynamic(() =>
    import("@/components/demo/elements/aui/syntax-highlighter").then(
      (m) => m.AuiSyntaxHighlighterDemo,
    ),
  ),
  "shiki-highlighter": dynamic(() =>
    import("@/components/demo/elements/aui/shiki-highlighter").then(
      (m) => m.AuiShikiHighlighterDemo,
    ),
  ),
  "mermaid-diagram": dynamic(() =>
    import("@/components/demo/elements/aui/mermaid-diagram").then(
      (m) => m.AuiMermaidDiagramDemo,
    ),
  ),
  "generative-ui": dynamic(() =>
    import("@/components/demo/elements/aui/generative-ui").then(
      (m) => m.AuiGenerativeUIDemo,
    ),
  ),
  "tooltip-icon-button": dynamic(() =>
    import("@/components/demo/elements/aui/tooltip-icon-button").then(
      (m) => m.AuiTooltipIconButtonDemo,
    ),
  ),
  logos: dynamic(() =>
    import("@/components/demo/elements/aui/logos").then((m) => m.AuiLogosDemo),
  ),
  "heat-graph": dynamic(() =>
    import("@/components/demo/elements/aui/heat-graph").then(
      (m) => m.AuiHeatGraphDemo,
    ),
  ),
};

export const generativeDemoName = (templateSlug: string) =>
  `Generative${templateSlug
    .split("-")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("")}Demo`;

export const ELEMENT_DEMOS: Record<string, ComponentType> = {
  ...HANDWRITTEN_DEMOS,
  ...Object.fromEntries(
    GENERATIVE_ELEMENTS.map((entry) => {
      const name = generativeDemoName(entry.templateSlug);
      return [
        entry.slug,
        dynamic(() =>
          import("@/components/demo/elements/generative-demos").then(
            (m) => m[name as keyof typeof m] as ComponentType,
          ),
        ),
      ];
    }),
  ),
};

/** One element's demo; `demo` is its slug, or `slug/variant-key` for a variant. */
export function ElementDemo({ demo }: { demo: string }) {
  const Demo = ELEMENT_DEMOS[demo];
  if (!Demo) throw new Error(`Missing element demo: ${demo}`);
  return <Demo />;
}
