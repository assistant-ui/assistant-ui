import { resource, tapEffect, tapMemo, tapRef } from "@assistant-ui/tap";
import { type ClientOutput, tapAssistantEmit } from "@assistant-ui/store";
import type { ComponentMessagePart } from "../types/MessagePartTypes";
import type {
  ComponentLifecycle,
  ComponentState,
} from "../types/scopes/component";

const COMPONENT_LIFECYCLES: readonly ComponentLifecycle[] = [
  "mounting",
  "active",
  "complete",
  "error",
  "cancelled",
];

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isComponentLifecycle = (value: unknown): value is ComponentLifecycle => {
  return (
    typeof value === "string" &&
    (COMPONENT_LIFECYCLES as readonly string[]).includes(value)
  );
};

const getComponentSeq = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
};

export const getComponentMetadataState = (
  unstableState: unknown,
  instanceId: string | undefined,
) => {
  if (!instanceId || !isObjectRecord(unstableState)) return undefined;
  const components = unstableState.components;
  if (!isObjectRecord(components)) return undefined;
  return components[instanceId];
};

export type ComponentClientProps = {
  messageId: string;
  part: ComponentMessagePart;
  componentState: unknown;
};

export const ComponentClient = resource(
  ({
    messageId,
    part,
    componentState,
  }: ComponentClientProps): ClientOutput<"component"> => {
    const assistantEmit = tapAssistantEmit();
    const previousRef = tapRef<{
      seq: number;
      lifecycle: ComponentLifecycle;
    } | null>(null);

    const state = tapMemo<ComponentState>(() => {
      const metadataState = isObjectRecord(componentState)
        ? componentState
        : {};
      const lifecycle = isComponentLifecycle(metadataState.lifecycle)
        ? metadataState.lifecycle
        : "mounting";
      const seq = getComponentSeq(metadataState.seq);

      return {
        messageId,
        name: part.name,
        ...(part.instanceId !== undefined
          ? { instanceId: part.instanceId }
          : {}),
        ...(part.parentId !== undefined ? { parentId: part.parentId } : {}),
        props: part.props ?? {},
        state:
          "state" in metadataState
            ? (metadataState.state as unknown)
            : undefined,
        lifecycle,
        seq,
      };
    }, [messageId, part, componentState]);

    tapEffect(() => {
      const previous = previousRef.current;
      previousRef.current = {
        seq: state.seq,
        lifecycle: state.lifecycle,
      };

      if (!previous) return;
      if (!state.instanceId) return;
      if (state.seq <= previous.seq) return;

      assistantEmit("component.state", {
        messageId: state.messageId,
        instanceId: state.instanceId,
        seq: state.seq,
        state: state.state,
      });

      if (state.lifecycle !== previous.lifecycle) {
        assistantEmit("component.lifecycle", {
          messageId: state.messageId,
          instanceId: state.instanceId,
          lifecycle: state.lifecycle,
          seq: state.seq,
        });
      }
    }, [state, assistantEmit]);

    return {
      getState: () => state,
      invoke: (action, payload) => {
        const { instanceId } = state;
        if (!instanceId)
          throw new Error("component.invoke requires a component instanceId");

        return new Promise((resolve, reject) => {
          assistantEmit("component.invoke", {
            messageId: state.messageId,
            instanceId,
            action,
            payload,
            ack: resolve,
            reject,
          });
        });
      },
      emit: (event, payload) => {
        const { instanceId } = state;
        if (!instanceId)
          throw new Error("component.emit requires a component instanceId");

        assistantEmit("component.emit", {
          messageId: state.messageId,
          instanceId,
          event,
          payload,
        });
      },
    };
  },
);
