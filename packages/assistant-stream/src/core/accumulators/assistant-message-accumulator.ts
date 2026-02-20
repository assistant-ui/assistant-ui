import { AssistantStreamChunk } from "../AssistantStreamChunk";
import { generateId } from "../utils/generateId";
import { parsePartialJsonObject } from "../../utils/json/parse-partial-json-object";
import {
  AssistantMessage,
  AssistantMessageStatus,
  AssistantMessageTiming,
  TextPart,
  ToolCallPart,
  SourcePart,
  AssistantMessagePart,
  ReasoningPart,
  FilePart,
  ComponentPart,
} from "../utils/types";
import { ObjectStreamAccumulator } from "../object/ObjectStreamAccumulator";
import { ObjectStreamOperation } from "../object/types";
import { ReadonlyJSONValue } from "../../utils";
import { TimingTracker } from "./TimingTracker";

export const createInitialMessage = ({
  unstable_state = null,
}: {
  unstable_state?: ReadonlyJSONValue;
} = {}): AssistantMessage => ({
  role: "assistant",
  status: { type: "running" },
  parts: [],
  get content() {
    return this.parts;
  },
  metadata: {
    unstable_state,
    unstable_data: [],
    unstable_annotations: [],
    steps: [],
    custom: {},
  },
});

const updatePartForPath = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk,
  updater: (part: AssistantMessagePart) => AssistantMessagePart,
): AssistantMessage => {
  if (message.parts.length === 0) {
    throw new Error("No parts available to update.");
  }

  if (chunk.path.length !== 1)
    throw new Error("Nested paths are not supported yet.");

  const partIndex = chunk.path[0]!;
  const updatedPart = updater(message.parts[partIndex]!);
  return {
    ...message,
    parts: [
      ...message.parts.slice(0, partIndex),
      updatedPart,
      ...message.parts.slice(partIndex + 1),
    ],
    get content() {
      return this.parts;
    },
  };
};

const handlePartStart = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { readonly type: "part-start" },
): AssistantMessage => {
  const partInit = chunk.part;
  if (partInit.type === "text" || partInit.type === "reasoning") {
    const newTextPart: TextPart | ReasoningPart = {
      type: partInit.type,
      text: "",
      status: { type: "running" },
      ...(partInit.parentId && { parentId: partInit.parentId }),
    };
    return {
      ...message,
      parts: [...message.parts, newTextPart],
      get content() {
        return this.parts;
      },
    };
  } else if (partInit.type === "tool-call") {
    const newToolCallPart: ToolCallPart = {
      type: "tool-call",
      state: "partial-call",
      status: { type: "running", isArgsComplete: false },
      toolCallId: partInit.toolCallId,
      toolName: partInit.toolName,
      argsText: "",
      args: {},
      ...(partInit.parentId && { parentId: partInit.parentId }),
    };
    return {
      ...message,
      parts: [...message.parts, newToolCallPart],
      get content() {
        return this.parts;
      },
    };
  } else if (partInit.type === "source") {
    const newSourcePart: SourcePart = {
      type: "source",
      sourceType: partInit.sourceType,
      id: partInit.id,
      url: partInit.url,
      ...(partInit.title ? { title: partInit.title } : undefined),
      ...(partInit.parentId && { parentId: partInit.parentId }),
    };
    return {
      ...message,
      parts: [...message.parts, newSourcePart],
      get content() {
        return this.parts;
      },
    };
  } else if (partInit.type === "file") {
    const newFilePart: FilePart = {
      type: "file",
      mimeType: partInit.mimeType,
      data: partInit.data,
    };
    return {
      ...message,
      parts: [...message.parts, newFilePart],
      get content() {
        return this.parts;
      },
    };
  } else if (partInit.type === "component") {
    const newComponentPart: ComponentPart = {
      type: "component",
      name: partInit.name,
      ...(partInit.instanceId !== undefined
        ? { instanceId: partInit.instanceId }
        : {}),
      ...(partInit.props !== undefined ? { props: partInit.props } : {}),
      ...(partInit.parentId ? { parentId: partInit.parentId } : {}),
    };
    return {
      ...message,
      parts: [...message.parts, newComponentPart],
      get content() {
        return this.parts;
      },
    };
  } else {
    throw new Error(`Unsupported part type: ${partInit.type}`);
  }
};

const handleToolCallArgsTextFinish = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & {
    readonly type: "tool-call-args-text-finish";
  },
): AssistantMessage => {
  return updatePartForPath(message, chunk, (part) => {
    if (part.type !== "tool-call") {
      throw new Error("Last is not a tool call");
    }

    // TODO this should never be hit; this happens if args-text-finish is emitted after result
    if (part.state !== "partial-call") return part;
    // throw new Error("Last is not a partial call");

    return {
      ...part,
      state: "call",
    };
  });
};

const handlePartFinish = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { readonly type: "part-finish" },
): AssistantMessage => {
  return updatePartForPath(message, chunk, (part) => ({
    ...part,
    status: { type: "complete", reason: "unknown" },
  }));
};

const handleTextDelta = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "text-delta" },
): AssistantMessage => {
  return updatePartForPath(message, chunk, (part) => {
    if (part.type === "text" || part.type === "reasoning") {
      return { ...part, text: part.text + chunk.textDelta };
    } else if (part.type === "tool-call") {
      const newArgsText = part.argsText + chunk.textDelta;

      // Fall back to existing args if parsing fails
      const newArgs = parsePartialJsonObject(newArgsText) ?? part.args;

      return { ...part, argsText: newArgsText, args: newArgs };
    } else {
      throw new Error(
        "text-delta received but part is neither text nor tool-call",
      );
    }
  });
};

const handleResult = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "result" },
): AssistantMessage => {
  return updatePartForPath(message, chunk, (part) => {
    if (part.type === "tool-call") {
      return {
        ...part,
        state: "result",
        ...(chunk.artifact !== undefined ? { artifact: chunk.artifact } : {}),
        result: chunk.result,
        isError: chunk.isError ?? false,
        status: { type: "complete", reason: "stop" },
      };
    } else {
      throw new Error("Result chunk received but part is not a tool-call");
    }
  });
};

const handleMessageFinish = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "message-finish" },
): AssistantMessage => {
  // avoid edge case where providers send finish chunks that overwrite message error status (issue #2181)
  if (
    message.status?.type === "incomplete" &&
    message.status?.reason === "error"
  ) {
    return message;
  }

  const newStatus = getStatus(chunk);
  return { ...message, status: newStatus };
};

const getStatus = (
  chunk:
    | (AssistantStreamChunk & { type: "message-finish" })
    | (AssistantStreamChunk & { type: "step-finish" }),
): AssistantMessageStatus => {
  if (chunk.finishReason === "tool-calls") {
    return {
      type: "requires-action",
      reason: "tool-calls",
    };
  } else if (
    chunk.finishReason === "stop" ||
    chunk.finishReason === "unknown"
  ) {
    return {
      type: "complete",
      reason: chunk.finishReason,
    };
  } else {
    return {
      type: "incomplete",
      reason: chunk.finishReason,
    };
  }
};

const handleAnnotations = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "annotations" },
): AssistantMessage => {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      unstable_annotations: [
        ...message.metadata.unstable_annotations,
        ...chunk.annotations,
      ],
    },
  };
};

const handleData = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "data" },
): AssistantMessage => {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      unstable_data: [...message.metadata.unstable_data, ...chunk.data],
    },
  };
};

const handleStepStart = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "step-start" },
): AssistantMessage => {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      steps: [
        ...message.metadata.steps,
        { state: "started", messageId: chunk.messageId },
      ],
    },
  };
};

const handleStepFinish = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "step-finish" },
): AssistantMessage => {
  const steps = message.metadata.steps.slice();
  const lastIndex = steps.length - 1;

  // Check if the previous step is a step-start (has state "started")
  if (steps.length > 0 && steps[lastIndex]?.state === "started") {
    steps[lastIndex] = {
      ...steps[lastIndex],
      state: "finished",
      finishReason: chunk.finishReason,
      usage: chunk.usage,
      isContinued: chunk.isContinued,
    };
  } else {
    // If no previous step-start exists, append a finished step
    steps.push({
      state: "finished",
      messageId: generateId(),
      finishReason: chunk.finishReason,
      usage: chunk.usage,
      isContinued: chunk.isContinued,
    });
  }

  return {
    ...message,
    metadata: {
      ...message.metadata,
      steps,
    },
  };
};

const handleErrorChunk = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "error" },
): AssistantMessage => {
  return {
    ...message,
    status: { type: "incomplete", reason: "error", error: chunk.error },
  };
};

const isObjectRecord = (
  value: ReadonlyJSONValue | undefined,
): value is Record<string, ReadonlyJSONValue> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getComponentSequence = (
  state: ReadonlyJSONValue,
  instanceId: string,
): number | undefined => {
  if (!isObjectRecord(state)) return undefined;

  const components = state.components;
  if (!isObjectRecord(components)) return undefined;

  const componentState = components[instanceId];
  if (!isObjectRecord(componentState)) return undefined;

  const sequence = componentState.sequence;
  return typeof sequence === "number" ? sequence : undefined;
};

const getComponentInstanceId = (operation: {
  path: readonly string[];
}): string | undefined => {
  const [root, instanceId] = operation.path;
  if (root !== "components") return undefined;
  if (typeof instanceId !== "string" || instanceId.length === 0)
    return undefined;
  return instanceId;
};

const filterStaleComponentOperations = (
  state: ReadonlyJSONValue,
  operations: readonly ObjectStreamOperation[],
) => {
  const incomingSequenceByInstance = new Map<string, number>();

  for (const operation of operations) {
    if (operation.type !== "set") continue;

    const [root, instanceId, field] = operation.path;
    if (root !== "components" || field !== "sequence") continue;
    if (typeof instanceId !== "string" || instanceId.length === 0) continue;
    if (typeof operation.value !== "number") continue;

    incomingSequenceByInstance.set(instanceId, operation.value);
  }

  if (incomingSequenceByInstance.size === 0) return operations;

  const staleInstances = new Set<string>();
  for (const [instanceId, incomingSequence] of incomingSequenceByInstance) {
    const currentSequence = getComponentSequence(state, instanceId);
    if (currentSequence !== undefined && incomingSequence <= currentSequence) {
      staleInstances.add(instanceId);
    }
  }

  if (staleInstances.size === 0) return operations;

  return operations.filter((operation) => {
    const instanceId = getComponentInstanceId(operation);
    if (instanceId === undefined) return true;
    if (!incomingSequenceByInstance.has(instanceId)) return true;
    return !staleInstances.has(instanceId);
  });
};

const handleUpdateState = (
  message: AssistantMessage,
  chunk: AssistantStreamChunk & { type: "update-state" },
): AssistantMessage => {
  const operations = filterStaleComponentOperations(
    message.metadata.unstable_state,
    chunk.operations,
  );

  if (operations.length === 0) return message;

  const acc = new ObjectStreamAccumulator(message.metadata.unstable_state);
  acc.append(operations);

  return {
    ...message,
    metadata: {
      ...message.metadata,
      unstable_state: acc.state,
    },
  };
};

const computeTiming = (
  tracker: TimingTracker,
  message: AssistantMessage,
): AssistantMessageTiming => {
  let outputTokens = 0;
  for (const step of message.metadata.steps) {
    if (step.state === "finished" && step.usage) {
      outputTokens += step.usage.outputTokens;
    }
  }

  let totalText = "";
  for (const part of message.parts) {
    if (part.type === "text" || part.type === "reasoning") {
      totalText += part.text;
    }
  }

  return tracker.getTiming(
    outputTokens > 0 ? outputTokens : undefined,
    totalText || undefined,
  );
};

const throttleCallback = (callback: () => void) => {
  let hasScheduled = false;
  return () => {
    if (hasScheduled) return;
    hasScheduled = true;
    queueMicrotask(() => {
      hasScheduled = false;
      callback();
    });
  };
};

export class AssistantMessageAccumulator extends TransformStream<
  AssistantStreamChunk,
  AssistantMessage
> {
  constructor({
    initialMessage,
    throttle,
    onError,
  }: {
    initialMessage?: AssistantMessage;
    throttle?: boolean;
    onError?: (error: string) => void;
  } = {}) {
    let message = initialMessage ?? createInitialMessage();
    const tracker = new TimingTracker();
    let controller:
      | TransformStreamDefaultController<AssistantMessage>
      | undefined;
    const emitChunk = throttle
      ? throttleCallback(() => {
          controller?.enqueue(message);
        })
      : () => {
          controller?.enqueue(message);
        };
    super({
      start(c) {
        controller = c;
      },
      transform(chunk) {
        tracker.recordChunk();
        const type = chunk.type;
        switch (type) {
          case "part-start":
            message = handlePartStart(message, chunk);
            if (chunk.part.type === "tool-call") {
              tracker.recordToolCallStart(chunk.part.toolCallId);
            }
            break;

          case "tool-call-args-text-finish":
            message = handleToolCallArgsTextFinish(message, chunk);
            break;

          case "part-finish":
            message = handlePartFinish(message, chunk);
            break;

          case "text-delta":
            message = handleTextDelta(message, chunk);
            tracker.recordFirstToken();
            break;
          case "result":
            message = handleResult(message, chunk);
            break;
          case "message-finish":
            message = handleMessageFinish(message, chunk);
            break;
          case "annotations":
            message = handleAnnotations(message, chunk);
            break;
          case "data":
            message = handleData(message, chunk);
            break;
          case "step-start":
            message = handleStepStart(message, chunk);
            break;
          case "step-finish":
            message = handleStepFinish(message, chunk);
            break;
          case "error":
            message = handleErrorChunk(message, chunk);
            onError?.(chunk.error);
            break;
          case "update-state":
            message = handleUpdateState(message, chunk);
            break;
          default: {
            const unhandledType: never = type;
            throw new Error(`Unsupported chunk type: ${unhandledType}`);
          }
        }

        if (message.status.type !== "running") {
          message = {
            ...message,
            metadata: {
              ...message.metadata,
              timing: computeTiming(tracker, message),
            },
          };
        }

        emitChunk();
      },
      flush(controller) {
        if (message.status?.type === "running") {
          // Check if there are any tool calls that require action
          const requiresAction =
            message.parts?.some(
              (part) =>
                part.type === "tool-call" &&
                (part.state === "call" || part.state === "partial-call") &&
                part.result === undefined,
            ) ?? false;
          message = handleMessageFinish(message, {
            type: "message-finish",
            path: [],
            finishReason: requiresAction ? "tool-calls" : "unknown",
            usage: {
              inputTokens: 0,
              outputTokens: 0,
            },
          });

          message = {
            ...message,
            metadata: {
              ...message.metadata,
              timing: computeTiming(tracker, message),
            },
          };

          controller.enqueue(message);
        }
      },
    });
  }
}
