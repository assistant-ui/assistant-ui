"use client";

import {
  ComponentType,
  FC,
  PropsWithChildren,
  ReactNode,
  createContext,
  useContext,
} from "react";

import { AvatarProps } from "./base/avatar";
import { TextContentPartComponent, ToolCallContentPartProps } from "../types";
import { AssistantRuntime } from "../runtimes";
import { AssistantRuntimeProvider, useAssistantContext } from "../context";
import { AssistantToolUI } from "../model-config";

export type SuggestionConfig = {
  text?: ReactNode;
  prompt: string;
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
  allowSpeak?: boolean | undefined;
  components?:
    | {
        Text?: TextContentPartComponent | undefined;
        ToolFallback?: ComponentType<ToolCallContentPartProps> | undefined;
      }
    | undefined;
};

export type BranchPickerConfig = {
  allowBranchPicker?: boolean | undefined;
};

export type ComposerConfig = {
  allowAttachments?: boolean | undefined;
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
    speak?: {
      tooltip?: string | undefined;
      stop?: {
        tooltip?: string | undefined;
      };
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
    addAttachment?:
      | {
          tooltip?: string | undefined;
        }
      | undefined;
    removeAttachment?: {
      tooltip?: string | undefined;
    };
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
  code?: {
    header?: {
      copy?: {
        tooltip?: string | undefined;
      };
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

  branchPicker?: BranchPickerConfig;

  composer?: ComposerConfig;

  strings?: StringsConfig;

  tools?: AssistantToolUI[]; // TODO add AssistantTool support
};

export const useThreadConfig = (): Omit<ThreadConfig, "runtime"> => {
  return useContext(ThreadConfigContext);
};

export type ThreadConfigProviderProps = PropsWithChildren<{
  config?: ThreadConfig | undefined;
}>;

export const ThreadConfigProvider: FC<ThreadConfigProviderProps> = ({
  children,
  config,
}) => {
  const assistant = useAssistantContext({ optional: true });

  const configProvider =
    config && Object.keys(config ?? {}).length > 0 ? (
      <ThreadConfigContext.Provider value={config}>
        {children}
      </ThreadConfigContext.Provider>
    ) : (
      <>{children}</>
    );
  if (!config?.runtime) return configProvider;

  if (assistant) {
    throw new Error(
      "You provided a runtime to <Thread> while simulataneously using <AssistantRuntimeProvider>. This is not allowed.",
    );
  }
  return (
    <AssistantRuntimeProvider runtime={config.runtime}>
      {configProvider}
    </AssistantRuntimeProvider>
  );
};

ThreadConfigProvider.displayName = "ThreadConfigProvider";
