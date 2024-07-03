import { TextContentPartComponent } from "@assistant-ui/react";
import { FC, PropsWithChildren, createContext, useContext } from "react";
import { AvatarProps } from "./base/avatar";

export type ThreadWelcomeConfig = {
  message?: string | null | undefined;
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
  assistantAvatar?: AvatarProps;

  welcome?: ThreadWelcomeConfig;
  assistantMessage?: AssistantMessageConfig;
  userMessage?: UserMessageConfig;

  strings?: StringsConfig;
};

export const useThreadConfig = () => {
  return useContext(ThreadConfigContext);
};

export type ThreadConfigProviderProps = PropsWithChildren<{
  config: ThreadConfig;
}>;

export const ThreadConfigProvider: FC<ThreadConfigProviderProps> = ({
  children,
  config,
}) => {
  return (
    <ThreadConfigContext.Provider value={config}>
      {children}
    </ThreadConfigContext.Provider>
  );
};

ThreadConfigProvider.displayName = "ThreadConfigProvider";
