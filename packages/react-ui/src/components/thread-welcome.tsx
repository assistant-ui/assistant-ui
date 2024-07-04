"use client";
import { ThreadPrimitive } from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { styled } from "../styled";
import { Avatar } from "./base/avatar";
import { useThreadConfig } from "./thread-config";

export const ThreadWelcome: FC = () => {
  return (
    <ThreadWelcomeRoot>
      <ThreadWelcomeAvatar />
      <ThreadWelcomeMessage />
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

const ThreadWelcomeAvatar: FC = () => {
  const { assistantAvatar: avatar = { fallback: "A" } } = useThreadConfig();
  return <Avatar {...avatar} />;
};

const ThreadWelcomeMessageStyled = styled("p", {
  className: "aui-thread-welcome-message",
});

type ThreadWelcomeMessageProps = Omit<
  ComponentPropsWithoutRef<typeof ThreadWelcomeMessageStyled>,
  "children"
> & { message?: string | undefined };

const ThreadWelcomeMessage = forwardRef<
  HTMLParagraphElement,
  ThreadWelcomeMessageProps
>(({ message: messageProp, ...rest }, ref) => {
  const { welcome: { message } = { message: "How can I help you today?" } } =
    useThreadConfig();
  return (
    <ThreadWelcomeMessageStyled {...rest} ref={ref}>
      {messageProp ?? message}
    </ThreadWelcomeMessageStyled>
  );
});

ThreadWelcomeMessage.displayName = "ThreadWelcomeMessage";
