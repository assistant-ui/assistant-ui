"use client";

import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useMemo,
} from "react";

import {
  AssistantToolUIActions,
  AssistantToolUIState,
} from "../../client/types/AssistantToolUI";
import {
  MessageClientActions,
  MessageClientState,
} from "../../legacy-runtime/client/MessageRuntimeClient";
import {
  ThreadListItemClientActions,
  ThreadListItemClientState,
} from "../../legacy-runtime/client/ThreadListItemRuntimeClient";
import {
  MessagePartClientActions,
  MessagePartClientState,
} from "../../legacy-runtime/client/MessagePartRuntimeClient";
import {
  ThreadClientActions,
  ThreadClientState,
} from "../../legacy-runtime/client/ThreadRuntimeClient";
import {
  ComposerClientActions,
  ComposerClientState,
} from "../../legacy-runtime/client/ComposerRuntimeClient";
import {
  AttachmentClientActions,
  AttachmentClientState,
} from "../../client/types/AttachmentClient";
import { StoreApi } from "../../utils/tap-store/tap-store-api";
import { Unsubscribe } from "@assistant-ui/tap";
import { ModelContextProvider } from "../../model-context";
import { AssistantRuntime } from "../../legacy-runtime/runtime/AssistantRuntime";
import {
  AssistantEventSelector,
  AssistantEvents,
  normalizeEventSelector,
} from "../../types/EventTypes";
import {
  ThreadListClientActions,
  ThreadListClientState,
} from "../../legacy-runtime/client/ThreadListRuntimeClient";

export type AssistantState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: AssistantToolUIState;

  readonly threadListItem: ThreadListItemClientState;
  readonly thread: ThreadClientState;
  readonly composer: ComposerClientState;
  readonly message: MessageClientState;
  readonly part: MessagePartClientState;
  readonly attachment: AttachmentClientState;
};

type AssistantApiField<
  TState,
  TActions,
  TMeta extends { source: string | null; query: any },
> = (() => StoreApi<TState, TActions>) &
  (TMeta | { source: null; query: Record<string, never> });

// Meta types for each API method
type ThreadsMeta = {
  source: "root";
  query: Record<string, never>;
};

type ToolUIMeta = {
  source: "root";
  query: Record<string, never>;
};

type ThreadListItemMeta = {
  source: "threads";
  query:
    | { type: "index"; index: number; archived: boolean }
    | { type: "main" }
    | { type: "id"; id: string };
};

type ThreadMeta = {
  source: "threads";
  query: { type: "main" };
};

type ComposerMeta = {
  source: "message" | "thread";
  query: Record<string, never>;
};

type MessageMeta = {
  source: "thread";
  query: { type: "index"; index: number };
};

type PartMeta = {
  source: "message" | "root";
  query: { type: "index"; index: number } | Record<string, never>;
};

type AttachmentMeta = {
  source: "message" | "composer";
  query: { type: "index"; index: number };
};

export type AssistantApi = {
  threads: AssistantApiField<
    ThreadListClientState,
    ThreadListClientActions,
    ThreadsMeta
  >;
  toolUIs: AssistantApiField<
    AssistantToolUIState,
    AssistantToolUIActions,
    ToolUIMeta
  >;
  threadListItem: AssistantApiField<
    ThreadListItemClientState,
    ThreadListItemClientActions,
    ThreadListItemMeta
  >;
  thread: AssistantApiField<ThreadClientState, ThreadClientActions, ThreadMeta>;
  composer: AssistantApiField<
    ComposerClientState,
    ComposerClientActions,
    ComposerMeta
  >;
  message: AssistantApiField<
    MessageClientState,
    MessageClientActions,
    MessageMeta
  >;
  part: AssistantApiField<
    MessagePartClientState,
    MessagePartClientActions,
    PartMeta
  >;
  attachment: AssistantApiField<
    AttachmentClientState,
    AttachmentClientActions,
    AttachmentMeta
  >;

  subscribe(listener: () => void): Unsubscribe;
  flushSync(): void;

  on<TEvent extends keyof AssistantEvents>(
    event: AssistantEventSelector<TEvent>,
    callback: (e: AssistantEvents[TEvent]) => void,
  ): Unsubscribe;

  // temp
  registerModelContextProvider(provider: ModelContextProvider): void;
  /** @internal */
  __internal_getRuntime(): AssistantRuntime | null;
};

export const createAssistantApiField = <
  TState,
  TActions,
  TMeta extends { source: any; query: any },
>(
  config: {
    get: () => StoreApi<TState, TActions>;
  } & (TMeta | { source: null; query: Record<string, never> }),
): AssistantApiField<TState, TActions, TMeta> => {
  const fn = config.get as AssistantApiField<TState, TActions, TMeta>;
  fn.source = config.source;
  fn.query = config.query;
  return fn;
};

const NO_OP_FN = () => () => {};

const AssistantApiContext = createContext<AssistantApi>({
  threads: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error("Threads is only available inside <AssistantProvider />");
    },
  }),
  toolUIs: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error("ToolUIs is only available inside <AssistantProvider />");
    },
  }),
  threadListItem: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error(
        "ThreadListItem is only available inside <AssistantProvider />",
      );
    },
  }),
  thread: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error("Thread is only available inside <AssistantProvider />");
    },
  }),
  composer: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error(
        "Composer is only available inside <AssistantProvider />",
      );
    },
  }),
  message: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error(
        "Message is only available inside <ThreadPrimitive.Messages />",
      );
    },
  }),
  part: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error(
        "Part is only available inside <MessagePrimitive.Parts />",
      );
    },
  }),
  attachment: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error(
        "Attachment is only available inside <MessagePrimitive.Attachments /> or <ComposerPrimitive.Attachments />",
      );
    },
  }),

  subscribe: NO_OP_FN,
  flushSync: NO_OP_FN,
  on: (selector) => {
    const { scope } = normalizeEventSelector(selector);
    throw new Error(`Event scope is not available in this component: ${scope}`);
  },

  registerModelContextProvider: () => {
    throw new Error(
      "Registering model context providers is only available inside <AssistantProvider />",
    );
  },
  __internal_getRuntime: () => {
    return null;
  },
});

export const useAssistantApi = (): AssistantApi => {
  return useContext(AssistantApiContext);
};

const mergeFns = <TArgs extends Array<unknown>>(
  fn1: (...args: TArgs) => void,
  fn2: (...args: TArgs) => void,
) => {
  if (fn1 === NO_OP_FN) return fn2;
  if (fn2 === NO_OP_FN) return fn1;

  return (...args: TArgs) => {
    fn1(...args);
    fn2(...args);
  };
};

const mergeFnsWithUnsubscribe = <TArgs extends Array<unknown>>(
  fn1: (...args: TArgs) => Unsubscribe,
  fn2: (...args: TArgs) => Unsubscribe,
) => {
  if (fn1 === NO_OP_FN) return fn2;
  if (fn2 === NO_OP_FN) return fn1;

  return (...args: TArgs) => {
    const unsubscribe1 = fn1(...args);
    const unsubscribe2 = fn2(...args);

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  };
};

const extendApi = (
  api: AssistantApi,
  api2: Partial<AssistantApi>,
): AssistantApi => {
  const api2Subscribe = api2.subscribe;
  const api2FlushSync = api2.flushSync;
  return {
    ...api,
    ...api2,
    subscribe: mergeFnsWithUnsubscribe(
      api.subscribe,
      api2Subscribe ?? NO_OP_FN,
    ),
    flushSync: mergeFns(api.flushSync, api2FlushSync ?? NO_OP_FN),
  };
};

export const AssistantApiProvider: FC<
  PropsWithChildren<{ api: Partial<AssistantApi> }>
> = ({ api: api2, children }) => {
  const api = useAssistantApi();
  const extendedApi = useMemo(() => extendApi(api, api2), [api, api2]);

  return (
    <AssistantApiContext value={extendedApi}>{children}</AssistantApiContext>
  );
};
