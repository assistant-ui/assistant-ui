import { resource, tapEffect, tapMemo, tapRef } from "@assistant-ui/tap";
import type { ComponentMessagePart } from "../../types";
import type { ComponentLifecycle, ComponentState } from "../scopes/component";
import type { ClientOutput } from "../types/client";
import type { AssistantEventPayload } from "../types/events";

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

const getComponentSequence = (value: unknown): number => {
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
  emit: <TEvent extends Exclude<keyof AssistantEventPayload, "*">>(
    event: TEvent,
    payload: AssistantEventPayload[TEvent],
  ) => void;
};

export const ComponentClient = resource(
  ({
    messageId,
    part,
    componentState,
    emit: emitEvent,
  }: ComponentClientProps): ClientOutput<"component"> => {
    const previousRef = tapRef<{
      sequence: number;
      lifecycle: ComponentLifecycle;
    } | null>(null);

    const state = tapMemo<ComponentState>(() => {
      const metadataState = isObjectRecord(componentState)
        ? componentState
        : {};
      const lifecycle = isComponentLifecycle(metadataState.lifecycle)
        ? metadataState.lifecycle
        : "mounting";
      const sequence = getComponentSequence(metadataState.sequence);

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
        sequence,
      };
    }, [messageId, part, componentState]);

    tapEffect(() => {
      const previous = previousRef.current;
      previousRef.current = {
        sequence: state.sequence,
        lifecycle: state.lifecycle,
      };

      if (!previous) return;
      if (!state.instanceId) return;
      if (state.sequence <= previous.sequence) return;

      emitEvent("component.state", {
        messageId: state.messageId,
        instanceId: state.instanceId,
        sequence: state.sequence,
        state: state.state,
      });

      if (state.lifecycle !== previous.lifecycle) {
        emitEvent("component.lifecycle", {
          messageId: state.messageId,
          instanceId: state.instanceId,
          lifecycle: state.lifecycle,
          sequence: state.sequence,
        });
      }
    }, [state, emitEvent]);

    return {
      getState: () => state,
      invoke: (action, payload) => {
        const { instanceId } = state;
        if (!instanceId)
          throw new Error("component.invoke requires a component instanceId");

        return new Promise((resolve, reject) => {
          emitEvent("component.invoke", {
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

        emitEvent("component.emit", {
          messageId: state.messageId,
          instanceId,
          event,
          payload,
        });
      },
    };
  },
);
