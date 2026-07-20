export {
  createAssistantStream,
  createAssistantStreamResponse,
  createAssistantStreamController,
} from "./core/modules/assistant-stream";
export {
  AssistantMessageAccumulator,
  createInitialMessage as unstable_createInitialMessage,
} from "./core/accumulators/assistant-message-accumulator";
export { AssistantStream } from "./core/AssistantStream";
export type { AssistantStreamController } from "./core/modules/assistant-stream";
export type { AssistantStreamChunk } from "./core/AssistantStreamChunk";
export {
  DataStreamDecoder,
  DataStreamEncoder,
} from "./core/serialization/data-stream/DataStream";
export {
  PlainTextDecoder,
  PlainTextEncoder,
} from "./core/serialization/PlainText";
export {
  AssistantTransportDecoder,
  AssistantTransportEncoder,
} from "./core/serialization/assistant-transport/AssistantTransport";
export {
  UIMessageStreamDecoder,
  type UIMessageStreamChunk,
  type UIMessageStreamDataChunk,
  type UIMessageStreamDecoderOptions,
} from "./core/serialization/ui-message-stream/UIMessageStream";
export { AssistantMessageStream } from "./core/accumulators/AssistantMessageStream";
export type {
  AssistantMessage,
  AssistantMessageTiming,
  DataPart,
  ToolCallTiming,
} from "./core/utils/types";

export type {
  Tool,
  ToolDeclaration,
  McpServerConfig,
  ToolModelContentPart,
  ToolModelOutputFunction,
} from "./core/tool/tool-types";
export { ToolResponse, type ToolResponseLike } from "./core/tool/ToolResponse";
export { ToolExecutionStream } from "./core/tool/ToolExecutionStream";
export type { ProviderOptions, ToolCallReader } from "./core/tool/tool-types";
export {
  toolResultStream as unstable_toolResultStream,
  unstable_runPendingTools,
  type ToolResultStreamOptions,
} from "./core/tool/toolResultStream";
export {
  toJSONSchema,
  toPartialJSONSchema,
  toToolsJSONSchema,
  type ToolJSONSchema,
  type ToToolsJSONSchemaOptions,
} from "./core/tool/schema-utils";

export type { TextStreamController } from "./core/modules/text";
export type { ToolCallStreamController } from "./core/modules/tool-call";

export { createGorpStream } from "./core/gorp/createGorpStream";
export {
  GorpStreamResponse,
  fromGorpStreamResponse,
} from "./core/gorp/GorpStreamResponse";
export type { GorpStreamChunk } from "./core/gorp/types";

import { createGorpStream } from "./core/gorp/createGorpStream";
import {
  GorpStreamResponse,
  fromGorpStreamResponse,
} from "./core/gorp/GorpStreamResponse";
import type { GorpStreamChunk } from "./core/gorp/types";

/** @deprecated Use `createGorpStream` instead. */
export const createObjectStream = createGorpStream;
/** @deprecated Use `GorpStreamResponse` instead. */
export const ObjectStreamResponse = GorpStreamResponse;
/** @deprecated Use `GorpStreamResponse` instead. */
export type ObjectStreamResponse = GorpStreamResponse;
/** @deprecated Use `fromGorpStreamResponse` instead. */
export const fromObjectStreamResponse = fromGorpStreamResponse;
/** @deprecated Use `GorpStreamChunk` instead. */
export type ObjectStreamChunk = GorpStreamChunk;

export {
  toGenericMessages,
  type GenericMessage,
  type GenericSystemMessage,
  type GenericUserMessage,
  type GenericAssistantMessage,
  type GenericToolMessage,
  type GenericTextPart,
  type GenericFilePart,
  type GenericToolCallPart,
  type GenericToolResultPart,
} from "./core/converters/toGenericMessages";
