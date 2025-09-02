"use client";

import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useDebugValue,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  AssistantToolUIActions,
  AssistantToolUIState,
} from "../../client/AssistantClient";
import {
  MessageClientActions,
  MessageClientState,
} from "../../client/MessageClient";
import {
  ThreadListItemClientActions,
  ThreadListItemClientState,
} from "../../client/ThreadListItemClient";
import {
  MessagePartClientActions,
  MessagePartClientState,
} from "../../client/MessagePartClient";
import {
  ThreadClientActions,
  ThreadClientState,
} from "../../client/ThreadClient";
import {
  ComposerClientActions,
  ComposerClientState,
} from "../../client/ComposerClient";
import {
  AttachmentClientActions,
  AttachmentClientState,
} from "../../client/AttachmentClient";
import { StoreApi } from "../../utils/tap-store/tap-store-api";
import { Unsubscribe } from "@assistant-ui/tap";
import { ModelContextProvider } from "../../model-context";
import { AssistantRuntime } from "../../api";
import {
  ThreadListClientActions,
  ThreadListClientState,
} from "../../client/ThreadListClient";

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

export type AssistantApi = {
  threads(): StoreApi<ThreadListClientState, ThreadListClientActions>;
  toolUIs(): StoreApi<AssistantToolUIState, AssistantToolUIActions>;
  threadListItem(): StoreApi<
    ThreadListItemClientState,
    ThreadListItemClientActions
  >;
  thread(): StoreApi<ThreadClientState, ThreadClientActions>;
  composer(): StoreApi<ComposerClientState, ComposerClientActions>;
  message(): StoreApi<MessageClientState, MessageClientActions>;
  part(): StoreApi<MessagePartClientState, MessagePartClientActions>;
  attachment(): StoreApi<AttachmentClientState, AttachmentClientActions>;

  readonly meta: AssistantMeta;

  subscribe(listener: () => void): Unsubscribe;
  flushSync(): void;

  // temp
  registerModelContextProvider(provider: ModelContextProvider): void;
  __internal_getRuntime(): AssistantRuntime | null;
};

export type AssistantMeta = {
  threads?: {
    source: "root";
    query: Record<string, never>;
  };
  toolUIs?: {
    source: "root";
    query: Record<string, never>;
  };
  threadListItem?: {
    source: "threads";
    query:
      | {
          type: "index";
          index: number;
          archived: boolean;
        }
      | {
          type: "main";
        }
      | {
          type: "id";
          id: string;
        };
  };
  thread?: {
    source: "threads";
    query: { type: "main" };
  };
  attachment?: {
    source: "message" | "composer";
    query: {
      type: "index";
      index: number;
    };
  };
  composer?: {
    source: "message" | "thread";
    query: Record<string, never>;
  };
  part?:
    | {
        source: "message";
        query: {
          type: "index";
          index: number;
        };
      }
    | {
        source: "root";
        query: Record<string, never>;
      };
  message?: {
    source: "thread";
    query: {
      type: "index";
      index: number;
    };
  };
};

const AssistantApiContext = createContext<AssistantApi>({
  threads(): never {
    throw new Error("Threads is only available inside <AssistantProvider />");
  },
  toolUIs(): never {
    throw new Error("ToolUIs is only available inside <AssistantProvider />");
  },
  threadListItem(): never {
    throw new Error(
      "ThreadListItem is only available inside <AssistantProvider />",
    );
  },
  thread(): never {
    throw new Error("Thread is only available inside <AssistantProvider />");
  },
  composer(): never {
    throw new Error("Composer is only available inside <AssistantProvider />");
  },
  message(): never {
    throw new Error(
      "Message is only available inside <ThreadPrimitive.Messages />",
    );
  },
  part(): never {
    throw new Error("Part is only available inside <MessagePrimitive.Parts />");
  },
  attachment(): never {
    throw new Error(
      "Attachment is only available inside <MessagePrimitive.Attachments /> or <ComposerPrimitive.Attachments />",
    );
  },

  subscribe: () => () => {},
  flushSync: () => {},
  meta: {},

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

export const useAssistantState = <T,>(
  selector: (state: AssistantState) => T,
): T => {
  const api = useAssistantApi();
  const proxiedState = useMemo(() => new ProxiedAssistantState(api), [api]);
  const slice = useSyncExternalStore(
    api.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );
  useDebugValue(slice);

  if (slice instanceof ProxiedAssistantState)
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );

  return slice;
};

class ProxiedAssistantState implements AssistantState {
  constructor(public readonly api: AssistantApi) {}

  get threads() {
    return this.api.threads().getState();
  }

  get toolUIs() {
    return this.api.toolUIs().getState();
  }

  get threadListItem() {
    return this.api.threadListItem().getState();
  }

  get thread() {
    return this.api.thread().getState();
  }

  get composer() {
    return this.api.composer().getState();
  }

  get message() {
    return this.api.message().getState();
  }

  get part() {
    return this.api.part().getState();
  }

  get attachment() {
    return this.api.attachment().getState();
  }
}

const extendApi = (
  api: AssistantApi,
  api2: Partial<AssistantApi>,
): AssistantApi => {
  const api2Subscribe = api2.subscribe;
  const api2FlushSync = api2.flushSync;
  return {
    ...api,
    ...api2,
    subscribe: api2Subscribe
      ? (listener) => {
          const unsubscribe = api.subscribe(listener);
          const unsubscribe2 = api2Subscribe(listener);
          return () => {
            unsubscribe();
            unsubscribe2();
          };
        }
      : api.subscribe,
    flushSync: api2FlushSync
      ? () => {
          api.flushSync();
          api2FlushSync();
        }
      : api.flushSync,
    meta: {
      ...api.meta,
      ...api2.meta,
    },
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
