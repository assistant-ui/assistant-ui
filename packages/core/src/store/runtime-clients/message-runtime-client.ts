import {
  withKey,
  resource,
  tapResource,
  tapMemo,
  tapState,
  type tapRef,
} from "@assistant-ui/tap";
import {
  type ClientOutput,
  tapClientLookup,
  tapClientResource,
} from "@assistant-ui/store";
import { MessageRuntime } from "../runtime/MessageRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { ComposerClient } from "./ComposerRuntimeClient";
import { MessagePartClient } from "./MessagePartRuntimeClient";
import { RefObject } from "react";
import { MessageState } from "../../types/scopes";
import { AttachmentRuntimeClient } from "./AttachmentRuntimeClient";
import {
  ComponentClient,
  getComponentMetadataState,
} from "../../client/ComponentClient";

const MessageAttachmentClientByIndex = resource(
  ({ runtime, index }: { runtime: MessageRuntime; index: number }) => {
    const attachmentRuntime = tapMemo(
      () => runtime.getAttachmentByIndex(index),
      [runtime, index],
    );
    return tapResource(AttachmentRuntimeClient({ runtime: attachmentRuntime }));
  },
);

const MessagePartByIndex = resource(
  ({ runtime, index }: { runtime: MessageRuntime; index: number }) => {
    const partRuntime = tapMemo(
      () => runtime.getMessagePartByIndex(index),
      [runtime, index],
    );
    return tapResource(MessagePartClient({ runtime: partRuntime }));
  },
);

export const MessageClient = resource(
  ({
    runtime,
    threadIdRef,
  }: {
    runtime: MessageRuntime;
    threadIdRef: tapRef.RefObject<string>;
  }): ClientOutput<"message"> => {
    const runtimeState = tapSubscribable(runtime);

    const [isCopiedState, setIsCopied] = tapState(false);
    const [isHoveringState, setIsHovering] = tapState(false);

    const messageIdRef = tapMemo(
      () => ({
        get current() {
          return runtime.getState().id;
        },
      }),
      [runtime],
    );

    const composer = tapClientResource(
      ComposerClient({
        runtime: runtime.composer,
        threadIdRef,
        messageIdRef,
      }),
    );
    const parts = tapClientLookup(
      () =>
        runtimeState.content.map((part, idx) =>
          withKey(
            "toolCallId" in part && part.toolCallId != null
              ? `toolCallId-${part.toolCallId}`
              : `index-${idx}`,
            MessagePartByIndex({ runtime, index: idx }),
          ),
        ),
      [runtimeState.content, runtime],
    );

    const components = tapClientLookup(() => {
      const entries: {
        part: MessageState["content"][number] & { type: "component" };
        index: number;
        key: string;
      }[] = [];
      let componentIndex = 0;

      for (const part of runtimeState.content) {
        if (part.type !== "component") continue;
        const index = componentIndex++;
        entries.push({
          part,
          index,
          key:
            part.instanceId !== undefined
              ? `instanceId-${part.instanceId}`
              : `index-${index}`,
        });
      }

      return entries.map(({ part, key }) =>
        withKey(
          key,
          ComponentClient({
            messageId: runtimeState.id,
            part,
            componentState: getComponentMetadataState(
              runtimeState.metadata.unstable_state,
              part.instanceId,
            ),
          }),
        ),
      );
    }, [
      runtimeState.id,
      runtimeState.content,
      runtimeState.metadata.unstable_state,
    ]);

    const attachments = tapClientLookup(
      () =>
        (runtimeState.attachments ?? []).map((attachment, idx) =>
          withKey(
            attachment.id,
            MessageAttachmentClientByIndex({ runtime, index: idx }),
          ),
        ),
      [runtimeState.attachments, runtime],
    );

    const state = tapMemo<MessageState>(() => {
      return {
        ...(runtimeState as MessageState),

        parts: parts.state,
        composer: composer.state,

        isCopied: isCopiedState,
        isHovering: isHoveringState,
      };
    }, [
      runtimeState,
      parts.state,
      composer.state,
      isCopiedState,
      isHoveringState,
    ]);

    return {
      getState: () => state,

      composer: () => composer.methods,

      reload: (config) => runtime.reload(config),
      speak: () => runtime.speak(),
      stopSpeaking: () => runtime.stopSpeaking(),
      submitFeedback: (feedback) => runtime.submitFeedback(feedback),
      switchToBranch: (options) => runtime.switchToBranch(options),
      getCopyText: () => runtime.unstable_getCopyText(),
      part: (selector) => {
        if ("index" in selector) {
          return parts.get({ index: selector.index });
        } else {
          return parts.get({ key: `toolCallId-${selector.toolCallId}` });
        }
      },
      component: (selector) => {
        if ("index" in selector) {
          return components.get(selector);
        } else {
          return components.get({ key: `instanceId-${selector.instanceId}` });
        }
      },

      attachment: (selector) => {
        if ("id" in selector) {
          return attachments.get({ key: selector.id });
        } else {
          return attachments.get(selector);
        }
      },

      setIsCopied,
      setIsHovering,

      __internal_getRuntime: () => runtime,
    };
  },
);
