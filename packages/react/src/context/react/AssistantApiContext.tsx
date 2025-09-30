"use client";

import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useMemo,
  useEffect,
} from "react";

import { ToolUIApi, ToolUIState, ToolUIMeta } from "../../client/types/ToolUI";
import {
  MessageClientApi,
  MessageClientState,
} from "../../client/types/Message";
import {
  ThreadListItemClientApi,
  ThreadListItemClientState,
} from "../../client/types/ThreadListItem";
import {
  MessagePartClientApi,
  MessagePartClientState,
} from "../../client/types/Part";
import { ThreadClientApi, ThreadClientState } from "../../client/types/Thread";
import {
  ComposerClientApi,
  ComposerClientState,
} from "../../client/types/Composer";
import {
  AttachmentClientApi,
  AttachmentClientState,
} from "../../client/types/Attachment";
import { Unsubscribe } from "@assistant-ui/tap";
import { ModelContextProvider } from "../../model-context";
import { AssistantRuntime } from "../../legacy-runtime/runtime/AssistantRuntime";
import {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
  normalizeEventSelector,
} from "../../types/EventTypes";
import {
  ThreadListClientApi,
  ThreadListClientState,
} from "../../client/types/ThreadList";
import { ThreadViewportProvider } from "../providers/ThreadViewportProvider";
import { DevToolsProviderApi } from "../../devtools/DevToolsHooks";
import {
  AssistantClientProps,
  useAssistantClient,
} from "../../client/AssistantClient";

export type AssistantState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: ToolUIState;

  readonly threadListItem: ThreadListItemClientState;
  readonly thread: ThreadClientState;
  readonly composer: ComposerClientState;
  readonly message: MessageClientState;
  readonly part: MessagePartClientState;
  readonly attachment: AttachmentClientState;
};

type AssistantApiField<
  TApi,
  TMeta extends { source: string | null; query: any },
> = (() => TApi) & (TMeta | { source: null; query: Record<string, never> });

// Meta types for each API method
type ThreadsMeta = {
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

type MessageMeta =
  | {
      source: "thread";
      query: { type: "index"; index: number };
    }
  | {
      source: "root";
      query: Record<string, never>;
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
  threads: AssistantApiField<ThreadListClientApi, ThreadsMeta>;
  toolUIs: AssistantApiField<ToolUIApi, ToolUIMeta>;
  threadListItem: AssistantApiField<
    ThreadListItemClientApi,
    ThreadListItemMeta
  >;
  thread: AssistantApiField<ThreadClientApi, ThreadMeta>;
  composer: AssistantApiField<ComposerClientApi, ComposerMeta>;
  message: AssistantApiField<MessageClientApi, MessageMeta>;
  part: AssistantApiField<MessagePartClientApi, PartMeta>;
  attachment: AssistantApiField<AttachmentClientApi, AttachmentMeta>;

  subscribe(listener: () => void): Unsubscribe;
  flushSync(): void;

  on<TEvent extends AssistantEvent>(
    event: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;

  // temp
  registerModelContextProvider(provider: ModelContextProvider): void;
  /** @internal */
  __internal_getRuntime?(): AssistantRuntime;
};

export const createAssistantApiField = <
  TApi,
  TMeta extends { source: any; query: any },
>(
  config: {
    get: () => TApi;
  } & (TMeta | { source: null; query: Record<string, never> }),
): AssistantApiField<TApi, TMeta> => {
  const fn = config.get as AssistantApiField<TApi, TMeta>;
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
});

const useAssistantApiImpl = (): AssistantApi => {
  return useContext(AssistantApiContext);
};

const useExtendedAssistantApiImpl = (
  config: AssistantClientProps,
): AssistantApi => {
  const api = useAssistantApiImpl();
  const api2 = useAssistantClient(config);
  const extendedApi = useMemo(() => extendApi(api, api2), [api, api2]);
  return extendedApi;
};

export function useAssistantApi(): AssistantApi;
export function useAssistantApi(config: AssistantClientProps): AssistantApi;
export function useAssistantApi(config?: AssistantClientProps): AssistantApi {
  if (config) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useExtendedAssistantApiImpl(config);
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAssistantApiImpl();
  }
}

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

export const AssistantProvider: FC<
  PropsWithChildren<{ api: Partial<AssistantApi>; devToolsVisible?: boolean }>
> = ({ api: api2, children, devToolsVisible = true }) => {
  const api = useAssistantApi();
  const extendedApi = useMemo(() => extendApi(api, api2), [api, api2]);

  useEffect(() => {
    if (!devToolsVisible || !api2.subscribe) return undefined;
    return DevToolsProviderApi.register(api2);
  }, [api2, devToolsVisible]);

  return (
    <AssistantApiContext.Provider value={extendedApi}>
      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadViewportProvider>{children}</ThreadViewportProvider>
    </AssistantApiContext.Provider>
  );
};
