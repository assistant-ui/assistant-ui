export {
  detectPlatform,
  detectPlatformDetailed,
  isMCP,
  hasChatGPTExtensions,
  enableDebugMode,
  disableDebugMode,
  type DetectionResult,
} from "./detect";
export {
  UniversalProvider,
  useUniversalBridge,
  usePlatform,
  type UniversalProviderProps,
} from "./provider";
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
} from "./hooks";
