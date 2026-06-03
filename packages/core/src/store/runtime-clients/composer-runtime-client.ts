import type { Unsubscribe } from "../../types/unsubscribe";
import {
  resource,
  tapMemo,
  tapEffect,
  tapResource,
  tapState,
  type tapRef,
  withKey,
} from "@assistant-ui/tap";
import {
  type ClientOutput,
  tapAssistantEmit,
  tapClientLookup,
} from "@assistant-ui/store";
import type {
  ComposerRuntime,
  EditComposerRuntime,
} from "../../runtime/api/composer-runtime";
import type { ComposerState, ComposerSendOptions } from "../scopes/composer";
import { AttachmentRuntimeClient } from "./attachment-runtime-client";
import { tapSubscribable } from "./tap-subscribable";
import { generateId } from "../../utils/id";
import type { CreateAppendMessage } from "../../runtime/api/thread-runtime";
import type { AppendMessage } from "../../types/message";
import type { QueueItemState } from "../scopes/queue-item";

export type ComposerQueueController = {
  isRunning: boolean;
  append: (message: CreateAppendMessage) => void;
  cancelRun: () => void;
};

type QueuedSend = {
  id: string;
  prompt: string;
  message: CreateAppendMessage;
};

const QueueItemClient = resource(
  ({
    item,
    onSteer,
    onRemove,
  }: {
    item: QueueItemState;
    onSteer: () => void;
    onRemove: () => void;
  }): ClientOutput<"queueItem"> => {
    return {
      getState: () => item,
      steer: onSteer,
      remove: onRemove,
    };
  },
);

const ComposerAttachmentClientByIndex = resource(
  ({ runtime, index }: { runtime: ComposerRuntime; index: number }) => {
    const attachmentRuntime = tapMemo(
      () => runtime.getAttachmentByIndex(index),
      [runtime, index],
    );

    return tapResource(
      AttachmentRuntimeClient({
        runtime: attachmentRuntime,
      }),
    );
  },
);

export const ComposerClient = resource(
  ({
    threadIdRef,
    messageIdRef,
    runtime,
    queueController,
  }: {
    threadIdRef: tapRef.RefObject<string>;
    messageIdRef?: tapRef.RefObject<string>;
    runtime: ComposerRuntime;
    queueController?: ComposerQueueController | undefined;
  }): ClientOutput<"composer"> => {
    const runtimeState = tapSubscribable(runtime);
    const emit = tapAssistantEmit();

    // Bind composer events to event manager
    tapEffect(() => {
      const unsubscribers: Unsubscribe[] = [];

      // Subscribe to composer events
      for (const event of ["send", "attachmentAdd"] as const) {
        const unsubscribe = runtime.unstable_on(event, () => {
          emit(`composer.${event}`, {
            threadId: threadIdRef.current,
            ...(messageIdRef && { messageId: messageIdRef.current }),
          });
        });
        unsubscribers.push(unsubscribe);
      }

      unsubscribers.push(
        runtime.unstable_on("attachmentAddError", (payload) => {
          // payload.error omitted: raw Error is not store-serializable; use runtime.unstable_on for it.
          emit("composer.attachmentAddError", {
            threadId: threadIdRef.current,
            ...(messageIdRef && { messageId: messageIdRef.current }),
            ...(payload.attachmentId && { attachmentId: payload.attachmentId }),
            reason: payload.reason,
            message: payload.message,
          });
        }),
      );

      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime, emit, threadIdRef, messageIdRef]);

    const attachments = tapClientLookup(
      () =>
        runtimeState.attachments.map((attachment, idx) =>
          withKey(
            attachment.id,
            ComposerAttachmentClientByIndex({
              runtime,
              index: idx,
            }),
          ),
        ),
      [runtimeState.attachments, runtime],
    );

    const [queued, setQueued] = tapState<readonly QueuedSend[]>([]);

    const composeQueuedMessage = (): QueuedSend => {
      const current = runtime.getState();
      const text = current.text;
      return {
        id: generateId(),
        prompt: text,
        message: {
          role: current.role,
          content: text ? [{ type: "text" as const, text }] : [],
          attachments: current.attachments as AppendMessage["attachments"],
          runConfig: current.runConfig,
          metadata: {
            custom: current.quote ? { quote: current.quote } : {},
          },
        },
      };
    };

    const isRunning = queueController?.isRunning ?? false;
    tapEffect(() => {
      if (!queueController || isRunning || queued.length === 0) return;
      const [head, ...rest] = queued;
      setQueued(rest);
      queueController.append(head!.message);
    }, [queueController, isRunning, queued, setQueued]);

    const queueItemClients = tapClientLookup(
      () =>
        queued.map((item) =>
          withKey(
            item.id,
            QueueItemClient({
              item: { id: item.id, prompt: item.prompt },
              onSteer: () => {
                queueController?.cancelRun();
                queueController?.append(item.message);
                setQueued((q) => q.filter((x) => x.id !== item.id));
              },
              onRemove: () => {
                setQueued((q) => q.filter((x) => x.id !== item.id));
              },
            }),
          ),
        ),
      [queued, queueController, setQueued],
    );

    const queueState = tapMemo<readonly QueueItemState[]>(
      () => queued.map(({ id, prompt }) => ({ id, prompt })),
      [queued],
    );

    const state = tapMemo<ComposerState>(() => {
      return {
        text: runtimeState.text,
        role: runtimeState.role,
        attachments: attachments.state,
        runConfig: runtimeState.runConfig,
        isEditing: runtimeState.isEditing,
        canCancel: runtimeState.canCancel,
        canSend: runtimeState.canSend,
        attachmentAccept: runtimeState.attachmentAccept,
        isEmpty: runtimeState.isEmpty,
        type: runtimeState.type ?? "thread",
        dictation: runtimeState.dictation,
        quote: runtimeState.quote,
        queue: queueState,
      };
    }, [runtimeState, attachments.state, queueState]);

    return {
      getState: () => state,
      setText: runtime.setText,
      setRole: runtime.setRole,
      setRunConfig: runtime.setRunConfig,
      addAttachment: runtime.addAttachment,
      reset: runtime.reset,
      clearAttachments: runtime.clearAttachments,
      send: (opts?: ComposerSendOptions) => {
        if (!queueController || !queueController.isRunning) {
          runtime.send(opts);
          return;
        }
        const item = composeQueuedMessage();
        void runtime.reset();
        if (opts?.steer) {
          queueController.cancelRun();
          queueController.append(item.message);
        } else {
          setQueued((q) => [...q, item]);
        }
      },
      cancel: runtime.cancel,
      beginEdit:
        (runtime as EditComposerRuntime).beginEdit ??
        (() => {
          throw new Error("beginEdit is not supported in this runtime");
        }),
      startDictation: runtime.startDictation,
      stopDictation: runtime.stopDictation,
      setQuote: runtime.setQuote,
      attachment: (selector) => {
        if ("id" in selector) {
          return attachments.get({ key: selector.id });
        } else {
          return attachments.get(selector);
        }
      },
      queueItem: queueController
        ? (selector) => queueItemClients.get(selector)
        : () => {
            throw new Error("Queue is not supported in this runtime");
          },
      __internal_getRuntime: () => runtime,
    };
  },
);
