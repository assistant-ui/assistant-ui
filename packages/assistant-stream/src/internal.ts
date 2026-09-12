// assistant-stream/internal - Internal implementation details
// Not part of the public API. Used by @assistant-ui/ai-sdk.

export {
  unwrapModelContentEnvelope,
  wrapModelContentEnvelope,
  type ModelContentEnvelope,
} from "./ai-sdk/modelContentEnvelope";
export {
  toAISDKContent,
  toAISDKDefaultOutput,
} from "./ai-sdk/toolOutputConversion";
