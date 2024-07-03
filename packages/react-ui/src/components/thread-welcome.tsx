"use client";
import { ThreadPrimitive } from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { styled } from "../styled";
import { Avatar } from "./base/avatar";
import { useThreadConfig } from "./thread-config";

export const ThreadWelcome: FC = () => {
  const {
    assistantAvatar: avatar = { fallback: "A" },
    welcome: { message } = { message: "How can I help you today?" },
  } = useThreadConfig();
  return (
    <ThreadWelcomeRoot>
      <Avatar {...avatar} />
      <ThreadWelcomeMessage>{message}</ThreadWelcomeMessage>
    </ThreadWelcomeRoot>
  );
};

ThreadWelcome.displayName = "ThreadWelcome";

const ThreadWelcomeRootStyled = styled("div", {
  className: "aui-thread-welcome-root",
});

type ThreadWelcomeRootProps = ComponentPropsWithoutRef<"div">;

export const ThreadWelcomeRoot = forwardRef<
  HTMLDivElement,
  ThreadWelcomeRootProps
>((props, ref) => {
  return (
    <ThreadPrimitive.Empty>
      <ThreadWelcomeRootStyled {...props} ref={ref} />
    </ThreadPrimitive.Empty>
  );
});

ThreadWelcomeRoot.displayName = "ThreadWelcomeRoot";

const ThreadWelcomeMessage = styled("p", {
  className: "aui-thread-welcome-message",
});

ThreadWelcomeMessage.displayName = "ThreadWelcomeMessage";
