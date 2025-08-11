// context providers
export { AssistantProvider } from "./react-context/assistant/AssistantProvider";
export { ThreadPrimitiveMessages } from "./react-context/thread/ThreadPrimitiveMessages";
export { MessagePrimitiveParts } from "./react-context/message/MessagePrimitiveParts";

// context hooks
export { useAssistantActions } from "./react-context/assistant/useAssistantActions";
export { useAssistant } from "./react-context/assistant/useAssistant";
export { useAssistantStoreApi } from "./react-context/assistant/useAssistantStoreApi";
export { useThread } from "./react-context/thread/useThread";
export { useThreadStoreApi } from "./react-context/thread/useThreadStoreApi";
export { useComposer } from "./react-context/thread/useComposer";
export { useMessage } from "./react-context/message/useMessage";
export { useMessageStoreApi } from "./react-context/message/useMessageStoreApi";
export { usePart } from "./react-context/part/usePart";
export { usePartStoreApi } from "./react-context/part/usePartStoreApi";
export { useTextPart } from "./react-context/part/useTextPart";
export { useToolPart } from "./react-context/part/useToolPart";

// api types
export type {
  AssistantActions,
  AssistantState,
} from "./client/types/assistant-types";
export type {
  ThreadActions,
  ThreadState,
  UICommand,
  SendInput as UICommandInput,
} from "./client/types/thread-types";
export type {
  ComposerActions,
  ComposerState,
} from "./client/types/composer-types";
export type {
  UIMessage,
  UIPart,
  TextUIPart,
  ToolUIPart,
  UIMessageLike,
  UIMessagePartLike,
} from "./client/types/message-types";

// client
export { useAssistantClient } from "./react-context/assistant/useAssistantClient";
export { AssistantClient } from "./client/AssistantClient";
export { BaseThread, ThreadClient } from "./client/BaseThread";
export { createConverter } from "./client/UIStateConverter";

// tool
export {
  type Toolkit,
  type BackendTool,
  type FrontendTool,
  backendTool,
  frontendTool,
} from "./tool/toolkit";

// utils
export { FileSystemDebugSink } from "./utils/FileSystemDebugSink";
