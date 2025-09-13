export type EventSource<T extends AssistantEvent = AssistantEvent> =
  T extends `${infer Source}.${string}` ? Source : never;

type ScopeConfig = {
  composer: "thread" | "message";
  thread: never;
  "thread-list-item": never;
};

export type SourceByScope<TScope extends AssistantEventScope<AssistantEvent>> =
  | (TScope extends "*" ? EventSource : never)
  | (TScope extends keyof ScopeConfig ? TScope : never)
  | {
      [K in keyof ScopeConfig]: TScope extends ScopeConfig[K] ? K : never;
    }[keyof ScopeConfig];

export type AssistantEventScope<TEvent extends AssistantEvent> =
  | "*"
  | EventSource<TEvent>
  | ScopeConfig[EventSource<TEvent>];

export type AssistantEventSelector<TEvent extends AssistantEvent> =
  | TEvent
  | {
      scope: AssistantEventScope<TEvent>;
      event: TEvent;
    };

export type AssistantEvent = keyof AssistantEventMap;

export type AssistantEventMap = {
  // Thread events (from ThreadRuntimeEventType)
  "thread.run-start": {
    threadId: string;
  };
  "thread.run-end": {
    threadId: string;
  };
  "thread.initialize": {
    threadId: string;
  };
  "thread.model-context-update": {
    threadId: string;
  };

  // Composer events (from ComposerRuntimeEventType)
  "composer.send": {
    threadId: string;
    messageId?: string;
  };
  "composer.attachment-add": {
    threadId: string;
    messageId?: string;
  };

  // Thread list item events (from ThreadListItemEventType)
  "thread-list-item.switched-to": {
    threadId: string;
  };
  "thread-list-item.switched-away": {
    threadId: string;
  };

  // Catch-all
  "*": {
    [K in Exclude<keyof AssistantEventMap, "*">]: {
      event: K;
      payload: AssistantEventMap[K];
    };
  }[Exclude<keyof AssistantEventMap, "*">];
};

export const normalizeEventSelector = <TEvent extends AssistantEvent>(
  selector: AssistantEventSelector<TEvent>,
) => {
  if (typeof selector === "string") {
    const source = selector.split(".")[0] as AssistantEventScope<TEvent>;
    return {
      scope: source,
      event: selector,
    };
  }

  return {
    scope: selector.scope,
    event: selector.event,
  };
};

export const checkEventScope = <
  TEvent extends AssistantEvent,
  TExpectedScope extends AssistantEventScope<AssistantEvent>,
>(
  expectedScope: TExpectedScope,
  scope: AssistantEventScope<TEvent>,
  _event: TEvent,
): _event is Extract<TEvent, `${SourceByScope<TExpectedScope>}.${string}`> => {
  return scope === expectedScope;
};

export type AssistantEventCallback<TEvent extends AssistantEvent> = (
  payload: AssistantEventMap[TEvent],
) => void;
