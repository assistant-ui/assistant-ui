export type EventSource<
  T extends keyof AssistantEvents = keyof AssistantEvents,
> = T extends `${infer Source}.${string}` ? Source : never;

type ScopeConfig = {
  composer: "thread" | "message";
  thread: never;
  "thread-list-item": never;
};

export type SourceByScope<
  TScope extends AssistantEventScope<keyof AssistantEvents>,
> =
  | (TScope extends "*" ? EventSource : never)
  | (TScope extends keyof ScopeConfig ? TScope : never)
  | {
      [K in keyof ScopeConfig]: TScope extends ScopeConfig[K] ? K : never;
    }[keyof ScopeConfig];

export type AssistantEventScope<TEvent extends keyof AssistantEvents> =
  | "*"
  | EventSource<TEvent>
  | ScopeConfig[EventSource<TEvent>];

export type AssistantEventSelector<TEvent extends keyof AssistantEvents> =
  | TEvent
  | {
      scope: AssistantEventScope<TEvent>;
      event: TEvent;
    };

export type AssistantEvents = {
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
};

export const normalizeEventSelector = <TEvent extends keyof AssistantEvents>(
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
  TEvent extends keyof AssistantEvents,
  TExpectedScope extends AssistantEventScope<keyof AssistantEvents>,
>(
  expectedScope: TExpectedScope,
  scope: AssistantEventScope<TEvent>,
  _event: TEvent,
): _event is Extract<TEvent, `${SourceByScope<TExpectedScope>}.${string}`> => {
  return scope === expectedScope;
};
