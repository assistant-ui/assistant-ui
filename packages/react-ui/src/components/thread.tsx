"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import { ComponentType, forwardRef, type FC } from "react";
import { ArrowDownIcon } from "lucide-react";
import { styled } from "../styled";
import { Composer } from "./composer";
import { ThreadWelcome } from "./thread-welcome";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";
import { EditComposer } from "./edit-composer";
import {
  ThreadConfig,
  ThreadConfigProvider,
  ThreadConfigProviderProps,
  useThreadConfig,
} from "./thread-config";
import { ThreadPrimitiveRootProps } from "@assistant-ui/react";

export const Thread: FC<ThreadConfig> = (config) => {
  return (
    <ThreadRoot config={config} asChild>
      <ThreadViewport>
        <ThreadWelcome />
        <ThreadMessages />
        <ThreadViewportFooter>
          <ThreadScrollToBottom />
          <Composer />
        </ThreadViewportFooter>
      </ThreadViewport>
    </ThreadRoot>
  );
};

export type ThreadRootProps = ThreadPrimitiveRootProps &
  ThreadConfigProviderProps;

const ThreadRootStyled = styled(ThreadPrimitive.Root, {
  className: "aui-thread-root",
});

export const ThreadRoot = forwardRef<HTMLDivElement, ThreadRootProps>(
  ({ config, ...props }, ref) => {
    return (
      <ThreadConfigProvider config={config}>
        <ThreadRootStyled {...props} ref={ref} />
      </ThreadConfigProvider>
    );
  },
);

ThreadRoot.displayName = "ThreadRoot";

export const ThreadViewport = styled(ThreadPrimitive.Viewport, {
  className: "aui-thread-viewport",
});

ThreadViewport.displayName = "ThreadViewport";

export const ThreadViewportFooter = styled("div", {
  className: "aui-thread-viewport-footer",
});

ThreadViewportFooter.displayName = "ThreadViewportFooter";

export const ThreadMessages: FC<{
  components?: {
    UserMessage?: ComponentType | undefined;
    EditComposer?: ComponentType | undefined;
    AssistantMessage?: ComponentType | undefined;
  };
}> = ({ components, ...rest }) => {
  return (
    <ThreadPrimitive.Messages
      components={{
        UserMessage: components?.UserMessage ?? UserMessage,
        EditComposer: components?.EditComposer ?? EditComposer,
        AssistantMessage: components?.AssistantMessage ?? AssistantMessage,
      }}
      {...rest}
    />
  );
};

ThreadMessages.displayName = "ThreadMessages";

const ThreadScrollToBottomIconButton = styled(TooltipIconButton, {
  variant: "outline",
  className: "aui-thread-scroll-to-bottom",
});

export const ThreadScrollToBottom = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      thread: { scrollToBottom: { tooltip = "Scroll to bottom" } = {} } = {},
    } = {},
  } = useThreadConfig();
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <ThreadScrollToBottomIconButton tooltip={tooltip} {...props} ref={ref}>
        <ArrowDownIcon />
      </ThreadScrollToBottomIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
});

ThreadScrollToBottom.displayName = "ThreadScrollToBottom";
