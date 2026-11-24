/*
 * What this example takes from assistant-ui, by kind, for the Components tab
 * of the settings. That includes the outside API the Models settings read. Kept by hand: an entry is added or removed together with
 * the import it stands for. A kind with no entries is still listed, so the
 * tab says the example uses none of it.
 */

export type UsedItem = {
  name: string;
  /** The package, or the path inside `@assistant-ui/ui`, it comes from. */
  from: string;
  /** The parts of a primitive the example renders, or the routes of an API. */
  parts?: readonly string[];
};

export type UsedKind = { kind: string; items: readonly UsedItem[] };

const REACT = "@assistant-ui/react";
const AI_SDK = "@assistant-ui/ai-sdk";
const UI = "@assistant-ui/ui";

export const USED: readonly UsedKind[] = [
  {
    kind: "Packages",
    items: [
      { name: REACT, from: "workspace" },
      { name: AI_SDK, from: "workspace" },
      { name: "@assistant-ui/react-markdown", from: "workspace" },
      { name: UI, from: "workspace" },
      { name: "tw-shimmer", from: "workspace" },
    ],
  },
  {
    kind: "Runtime",
    items: [
      { name: "useChatRuntime", from: AI_SDK },
      { name: "unstable_enableMessageQueue", from: AI_SDK },
      { name: "AssistantChatTransport", from: AI_SDK },
      { name: "frontendTools", from: AI_SDK },
      { name: "AssistantRuntimeProvider", from: REACT },
      { name: "WebSpeechDictationAdapter", from: REACT },
      { name: "WebSpeechSynthesisAdapter", from: REACT },
      { name: "createSuggestionAdapter", from: REACT },
      { name: "FeedbackAdapter", from: REACT },
    ],
  },
  {
    kind: "Hooks",
    items: [
      { name: "useAui", from: REACT },
      { name: "useAuiState", from: REACT },
      { name: "useAuiEvent", from: REACT },
      { name: "useThreadTokenUsage", from: AI_SDK },
      { name: "useMessageTiming", from: REACT },
      { name: "useThreadViewport", from: REACT },
      { name: "groupPartByType", from: REACT },
      { name: "useIsMobile", from: `${UI}/hooks/use-mobile` },
    ],
  },
  {
    kind: "Primitives",
    items: [
      {
        name: "ThreadPrimitive",
        from: REACT,
        parts: [
          "Root",
          "Viewport",
          "Messages",
          "ViewportFooter",
          "ScrollToBottom",
          "Suggestion",
        ],
      },
      {
        name: "ComposerPrimitive",
        from: REACT,
        parts: [
          "Root",
          "Input",
          "Send",
          "Cancel",
          "AddAttachment",
          "Attachments",
          "Queue",
          "AttachmentDropzone",
          "Dictate",
          "StopDictation",
          "DictationTranscript",
        ],
      },
      {
        name: "MessagePrimitive",
        from: REACT,
        parts: ["Root", "Parts", "GroupedParts", "Attachments", "Error"],
      },
      {
        name: "QueueItemPrimitive",
        from: REACT,
        parts: ["Text", "Steer", "Remove"],
      },
      {
        name: "ActionBarPrimitive",
        from: REACT,
        parts: [
          "Root",
          "Copy",
          "Edit",
          "Speak",
          "StopSpeaking",
          "FeedbackPositive",
          "FeedbackNegative",
        ],
      },
      {
        name: "ActionBarMorePrimitive",
        from: REACT,
        parts: ["Root", "Trigger", "Content", "Item"],
      },
      {
        name: "AttachmentPrimitive",
        from: REACT,
        parts: ["Root", "Name", "Remove", "unstable_Thumb"],
      },
      { name: "ErrorPrimitive", from: REACT, parts: ["Root", "Message"] },
      {
        name: "ThreadListPrimitive",
        from: REACT,
        parts: ["Root", "New", "Items", "LoadMore"],
      },
      {
        name: "ThreadListItemPrimitive",
        from: REACT,
        parts: ["Root", "Trigger", "Title", "Archive", "Unarchive", "Delete"],
      },
      {
        name: "ThreadListItemMorePrimitive",
        from: REACT,
        parts: ["Root", "Trigger", "Content", "Item"],
      },
      { name: "AuiIf", from: REACT },
    ],
  },
  {
    kind: "Elements",
    items: [
      { name: "ContextBreakdown", from: `${UI}/elements/context-breakdown` },
      {
        name: "ConversationMapAui",
        from: `${UI}/elements/conversation-map.aui`,
      },
      { name: "FeedbackDialog", from: `${UI}/elements/feedback-dialog` },
      {
        name: "ThreadFollowupSuggestions",
        from: `${UI}/elements/follow-up-suggestions.aui`,
      },
      { name: "MarkdownText", from: `${UI}/elements/markdown-text` },
      { name: "MessageTiming", from: `${UI}/elements/message-timing.aui` },
      {
        name: "Reasoning",
        from: `${UI}/elements/reasoning.aui`,
        parts: ["Root", "Trigger", "Content", "Text"],
      },
      /*
       * These four are drawn from primitives the way their docs set out for
       * a runtime, so nothing is imported from the element's own file.
       */
      { name: "Message queue", from: "ComposerPrimitive.Queue" },
      { name: "Edit message", from: "ActionBarPrimitive.Edit" },
      { name: "Day separator", from: `${UI}/elements/surfaces` },
      { name: "Regenerate menu", from: "the app's menu" },
      {
        name: "SyntaxHighlighter",
        from: `${UI}/elements/shiki-highlighter.aui`,
      },
    ],
  },
  {
    kind: "Components",
    items: [
      { name: "Button", from: `${UI}/ui/button` },
      { name: "Dialog", from: `${UI}/ui/dialog` },
      { name: "Input", from: `${UI}/ui/input` },
      { name: "Kbd", from: `${UI}/ui/kbd` },
      { name: "Popover", from: `${UI}/ui/popover` },
      { name: "Separator", from: `${UI}/ui/separator` },
      { name: "Sheet", from: `${UI}/ui/sheet` },
      { name: "Switch", from: `${UI}/ui/switch` },
      { name: "Textarea", from: `${UI}/ui/textarea` },
      { name: "Tooltip", from: `${UI}/ui/tooltip` },
    ],
  },
  {
    kind: "Types",
    items: [
      { name: "ToolCallMessagePartProps", from: REACT },
      { name: "FrontendTools", from: AI_SDK },
    ],
  },
  {
    kind: "APIs",
    items: [
      {
        name: "Modelpedia API",
        from: "api.modelpedia.dev/v1",
        parts: ["GET /models", "GET /models/types", "GET /providers"],
      },
    ],
  },
  { kind: "Themes", items: [] },
  { kind: "Icons", items: [] },
  { kind: "Blocks", items: [] },
  { kind: "Examples", items: [] },
  { kind: "Skills", items: [] },
];
