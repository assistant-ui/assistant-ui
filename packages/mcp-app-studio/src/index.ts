export * from "./core";
export {
  detectPlatform,
  detectPlatformDetailed,
  isMCP,
  hasChatGPTExtensions,
  enableDebugMode,
  disableDebugMode,
  type DetectionResult,
} from "./universal/detect";
export {
  UniversalProvider,
  useUniversalBridge,
  usePlatform,
  type UniversalProviderProps,
} from "./universal/provider";
export {
  useHostContext,
  useTheme,
  useCapabilities,
  useToolInput,
  useToolInputPartial,
  useToolResult,
  useDisplayMode,
  useCallTool,
  useOpenLink,
  useSendMessage,
  useUpdateModelContext,
  useWidgetState,
  useLog,
  useFeature,
} from "./universal/hooks";
export * from "./extensions/chatgpt";
