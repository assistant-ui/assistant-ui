"use client";

import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useMemo,
  useEffect,
} from "react";
import { useResource } from "@assistant-ui/tap/react";

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
import { Unsubscribe } from "../../types";
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
import { DevToolsProviderApi } from "../../devtools/DevToolsHooks";
import {
  AssistantClientProps,
  useAssistantClient,
} from "../../client/AssistantClient";
import { ToolsApi, ToolsMeta, ToolsState } from "../../client/types/Tools";
import {
  ModelContextApi,
  ModelContextMeta,
} from "../../client/types/ModelContext";
import {
  DerivedScopes,
  DerivedScopesInput,
} from "../../utils/tap-store/derived-scopes";

export type AssistantState = {
  readonly threads: ThreadListClientState;
  readonly tools: ToolsState;

  readonly threadListItem: ThreadListItemClientState;
  readonly thread: ThreadClientState;
  readonly composer: ComposerClientState;
  readonly message: MessageClientState;
  readonly part: MessagePartClientState;
  readonly attachment: AttachmentClientState;
};

export type AssistantApiField<
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
  tools: AssistantApiField<ToolsApi, ToolsMeta>;
  modelContext: AssistantApiField<ModelContextApi, ModelContextMeta>;
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

  on<TEvent extends AssistantEvent>(
    event: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
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
  tools: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error("Tools is only available inside <AssistantProvider />");
    },
  }),
  modelContext: createAssistantApiField({
    source: null,
    query: {},
    get: (): never => {
      throw new Error(
        "ModelContext is only available inside <AssistantProvider />",
      );
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
  on: (selector) => {
    const { scope } = normalizeEventSelector(selector);
    throw new Error(`Event scope is not available in this component: ${scope}`);
  },
});

export const useAssistantApiImpl = (): AssistantApi => {
  return useContext(AssistantApiContext);
};

/**
 * Hook to extend the current AssistantApi with additional derived scope fields and special callbacks.
 * This merges the derived fields with the existing API from context.
 * Fields are automatically memoized based on source and query changes.
 * Special callbacks (on, subscribe) use the useEffectEvent pattern to always access latest values.
 *
 * @param scopes - Record of field names to DerivedScope resource elements, plus optional special callbacks
 * @returns The merged AssistantApi
 *
 * @example
 * ```tsx
 * const api = useExtendedAssistantApi({
 *   message: DerivedScope({
 *     source: "root",
 *     query: {},
 *     get: () => messageApi,
 *   }),
 *   on: (selector, callback) => {
 *     // Custom event filtering logic
 *   },
 * });
 * ```
 */
export const useExtendedAssistantApi = (
  scopes: DerivedScopesInput,
): AssistantApi => {
  const baseApi = useAssistantApiImpl();
  const partialApi = useResource(DerivedScopes(scopes));
  return useMemo(() => extendApi(baseApi, partialApi), [baseApi, partialApi]);
};

const useExtendedAssistantApiImpl = (
  config: AssistantClientProps,
): AssistantApi => {
  return useAssistantClient(config);
};

export function useAssistantApi(): AssistantApi;
export function useAssistantApi(config: AssistantClientProps): AssistantApi;
export function useAssistantApi(config?: AssistantClientProps): AssistantApi {
  if (config) {
    return useExtendedAssistantApiImpl(config);
  } else {
    return useAssistantApiImpl();
  }
}

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

export const extendApi = (
  api: AssistantApi,
  api2: Partial<AssistantApi>,
): AssistantApi => {
  const api2Subscribe = api2.subscribe;
  return {
    ...api,
    ...api2,
    subscribe: mergeFnsWithUnsubscribe(
      api.subscribe,
      api2Subscribe ?? NO_OP_FN,
    ),
  };
};

export const AssistantProvider: FC<
  PropsWithChildren<{ api: AssistantApi; devToolsVisible?: boolean }>
> = ({ api, children, devToolsVisible = true }) => {
  useEffect(() => {
    if (!devToolsVisible || !api.subscribe) return undefined;
    return DevToolsProviderApi.register(api);
  }, [api, devToolsVisible]);

  return (
    <AssistantApiContext.Provider value={api}>
      {children}
    </AssistantApiContext.Provider>
  );
};
