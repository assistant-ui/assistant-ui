"use client";

import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { AssistantContext } from "../../utils/context/AssistantContext";
import type { AppendMessage } from "../../utils/context/stores/AssistantTypes";
import {
  type ConverterCallback,
  ThreadMessageConverter,
} from "../ThreadMessageConverter";
import {
  type VercelRSCThreadMessage,
  symbolInnerRSCMessage,
} from "./VercelThreadMessage";
import { useDummyAIAssistantContext } from "./useDummyAIAssistantContext";

export type VercelRSCMessage = {
  id: string;
  role: "user" | "assistant";
  display: ReactNode;
  createdAt?: Date;
};

type VercelRSCAssistantProviderBaseProps<T> = PropsWithChildren<{
  messages: T[];
  append: (message: AppendMessage) => Promise<void>;
  edit?: (message: AppendMessage) => Promise<void>;
  reload?: (parentId: string | null) => Promise<void>;
  convertMessage?: (message: T) => VercelRSCMessage;
}>;

type RSCMessageConverter<T> = {
  convertMessage: (message: T) => VercelRSCMessage;
};

export type VercelRSCAssistantProviderProps<T = VercelRSCMessage> =
  VercelRSCAssistantProviderBaseProps<T> &
    (T extends VercelRSCMessage ? object : RSCMessageConverter<T>);

const vercelToThreadMessage = <T,>(
  converter: (message: T) => VercelRSCMessage,
  rawMessage: T,
): VercelRSCThreadMessage<T> => {
  const message = converter(rawMessage);

  return {
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
    createdAt: message.createdAt ?? new Date(),
    ...{ status: "done" },
    [symbolInnerRSCMessage]: rawMessage,
  };
};

const EMPTY_BRANCHES: never[] = [];
const getBranches = () => {
  return EMPTY_BRANCHES;
};

const switchToBranch = () => {
  throw new Error(
    "Branch switching is not supported by VercelRSCAssistantProvider.",
  );
};

const cancelRun = () => {
  // in dev mode, log a warning
  if (process.env["NODE_ENV"] === "development") {
    console.warn(
      "Run cancellation is not supported by VercelRSCAssistantProvider.",
    );
  }
};

export const VercelRSCAssistantProvider = <
  T extends WeakKey = VercelRSCMessage,
>({
  children,
  convertMessage,
  messages: vercelMessages,
  append: appendCallback,
  edit,
  reload,
}: VercelRSCAssistantProviderProps<T>) => {
  const context = useDummyAIAssistantContext();

  const [isRunning, setIsRunning] = useState(false);

  const withRunning = useCallback((callback: Promise<unknown>) => {
    setIsRunning(true);
    return callback.finally(() => setIsRunning(false));
  }, []);

  // flush the converter cache when the convertMessage prop changes
  const [converter, convertCallback] = useMemo(() => {
    const rscConverter = convertMessage ?? ((m: T) => m as VercelRSCMessage);
    const convertCallback: ConverterCallback<T> = (m, cache) => {
      if (cache) return cache;
      return vercelToThreadMessage(rscConverter, m);
    };
    return [new ThreadMessageConverter(), convertCallback];
  }, [convertMessage]);

  // -- useThread sync --

  const messages = useMemo(() => {
    return converter.convertMessages(convertCallback, vercelMessages);
  }, [converter, convertCallback, vercelMessages]);

  const append = useCallback(
    async (message: AppendMessage) => {
      if (
        message.parentId !==
        (context.useThread.getState().messages.at(-1)?.id ?? null)
      ) {
        if (!edit)
          throw new Error(
            "Message editing is not enabled, please provide an edit callback to VercelRSCAssistantProvider.",
          );
        await withRunning(edit(message));
      } else {
        await withRunning(appendCallback(message));
      }
    },
    [context, withRunning, appendCallback, edit],
  );

  const startRun = useCallback(
    async (parentId: string | null) => {
      if (!reload)
        throw new Error(
          "Message reloading is not enabled, please provide a reload callback to VercelRSCAssistantProvider.",
        );
      await withRunning(reload(parentId));
    },
    [withRunning, reload],
  );

  useMemo(() => {
    context.useThread.setState(
      {
        messages,
        isRunning,

        getBranches,
        switchToBranch,

        append,
        startRun,
        cancelRun,
      },
      true,
    );
  }, [context, messages, isRunning, append, startRun]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
