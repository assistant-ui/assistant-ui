import type { ReadonlyJSONObject } from "assistant-stream/utils";

export type ComponentLifecycle =
  | "mounting"
  | "active"
  | "complete"
  | "error"
  | "cancelled";

export type ComponentState = {
  readonly messageId: string;
  readonly instanceId?: string;
  readonly name: string;
  readonly parentId?: string;
  readonly props: ReadonlyJSONObject;
  readonly state: unknown;
  readonly lifecycle: ComponentLifecycle;
  readonly seq: number;
};

export type ComponentMethods = {
  getState(): ComponentState;
  invoke(action: string, payload?: unknown): Promise<unknown>;
  emit(event: string, payload?: unknown): void;
};

export type ComponentMeta = {
  source: "message";
  query:
    | { type: "instanceId"; instanceId: string }
    | { type: "index"; index: number };
};

export type ComponentEvents = {
  "component.lifecycle": {
    messageId: string;
    instanceId: string;
    lifecycle: ComponentLifecycle;
    seq: number;
  };
  "component.state": {
    messageId: string;
    instanceId: string;
    seq: number;
    state: unknown;
  };
  "component.invoke": {
    messageId: string;
    instanceId: string;
    action: string;
    payload: unknown;
    ack: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  };
  "component.emit": {
    messageId: string;
    instanceId: string;
    event: string;
    payload: unknown;
  };
};

export type ComponentClientSchema = {
  methods: ComponentMethods;
  meta: ComponentMeta;
  events: ComponentEvents;
};
