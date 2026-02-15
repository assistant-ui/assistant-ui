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
};

export type ComponentClientSchema = {
  methods: ComponentMethods;
  meta: ComponentMeta;
  events: ComponentEvents;
};
