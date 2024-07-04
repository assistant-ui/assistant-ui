import {
  AssistantRuntimeProvider,
  TextContentPartComponent,
} from "@assistant-ui/react";
import { FC, PropsWithChildren, createContext, useContext } from "react";
import { AvatarProps } from "./base/avatar";
import { AssistantRuntime } from "@assistant-ui/react";

export type SuggestionConfig = {
  icon?: string;
  text: string;
  prompt?: string;
};

export type ThreadWelcomeConfig = {
  message?: string | null | undefined;
  suggestions?: SuggestionConfig[] | undefined;
};

export type UserMessageConfig = {
  allowEdit?: boolean | undefined;
};

export type AssistantMessageConfig = {
  allowReload?: boolean | undefined;
  allowCopy?: boolean | undefined;
  components?:
    | {
        Text?: TextContentPartComponent | undefined;
      }
    | undefined;
};

export type StringsConfig = {
  assistantModal?: {
    open: {
      button: {
        tooltip?: string | undefined;
      };
    };
    closed: {
      button: {
        tooltip?: string | undefined;
      };
    };
  };
  thread?: {
    scrollToBottom?: {
      tooltip?: string | undefined;
    };
  };
  userMessage?: {
    edit?: {
      tooltip?: string | undefined;
    };
  };
  assistantMessage?: {
    reload?: {
      tooltip?: string | undefined;
    };
    copy?: {
      tooltip?: string | undefined;
    };
  };
  branchPicker?: {
    previous?: {
      tooltip?: string | undefined;
    };
    next?: {
      tooltip?: string | undefined;
    };
  };
  composer?: {
    send?:
      | {
          tooltip?: string | undefined;
        }
      | undefined;
    cancel?:
      | {
          tooltip?: string | undefined;
        }
      | undefined;
    input?: {
      placeholder?: string | undefined;
    };
  };
  editComposer?: {
    send?: {
      label?: string | undefined;
    };
    cancel?: {
      label?: string | undefined;
    };
  };
};

const ThreadConfigContext = createContext<ThreadConfig>({});

export type ThreadConfig = {
  runtime?: AssistantRuntime;

  assistantAvatar?: AvatarProps;

  welcome?: ThreadWelcomeConfig;
  assistantMessage?: AssistantMessageConfig;
  userMessage?: UserMessageConfig;

  strings?: StringsConfig;
};

export const useThreadConfig = (): Omit<ThreadConfig, "runtime"> => {
  return useContext(ThreadConfigContext);
};

export type ThreadConfigProviderProps = PropsWithChildren<{
  config: ThreadConfig;
}>;

export const ThreadConfigProvider: FC<ThreadConfigProviderProps> = ({
  children,
  config,
}) => {
  const configProvider = (
    <ThreadConfigContext.Provider value={config}>
      {children}
    </ThreadConfigContext.Provider>
  );
  if (!config.runtime) return configProvider;
  return (
    <AssistantRuntimeProvider runtime={config.runtime}>
      {configProvider}
    </AssistantRuntimeProvider>
  );
};

ThreadConfigProvider.displayName = "ThreadConfigProvider";
