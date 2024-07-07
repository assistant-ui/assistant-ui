"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { styled } from "../styled";
import { Avatar } from "./base/avatar";
import { SuggestionConfig, useThreadConfig } from "./thread-config";

export const ThreadWelcome: FC = () => {
  return (
    <ThreadWelcomeRoot>
      <ThreadWelcomeCenter>
        <ThreadWelcomeAvatar />
        <ThreadWelcomeMessage />
      </ThreadWelcomeCenter>
      <ThreadWelcomeSuggestions />
    </ThreadWelcomeRoot>
  );
};

ThreadWelcome.displayName = "ThreadWelcome";

const ThreadWelcomeRootStyled = styled("div", {
  className: "aui-thread-welcome-root",
});

export const ThreadWelcomeCenter = styled("div", {
  className: "aui-thread-welcome-center",
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

export const ThreadWelcomeAvatar: FC = () => {
  const { assistantAvatar: avatar = { fallback: "A" } } = useThreadConfig();
  return <Avatar {...avatar} />;
};

const ThreadWelcomeMessageStyled = styled("p", {
  className: "aui-thread-welcome-message",
});

export type ThreadWelcomeMessageProps = Omit<
  ComponentPropsWithoutRef<typeof ThreadWelcomeMessageStyled>,
  "children"
> & { message?: string | undefined };

export const ThreadWelcomeMessage = forwardRef<
  HTMLParagraphElement,
  ThreadWelcomeMessageProps
>(({ message: messageProp, ...rest }, ref) => {
  const { welcome: { message = "How can I help you today?" } = {} } =
    useThreadConfig();
  return (
    <ThreadWelcomeMessageStyled {...rest} ref={ref}>
      {messageProp ?? message}
    </ThreadWelcomeMessageStyled>
  );
});

ThreadWelcomeMessage.displayName = "ThreadWelcomeMessage";

const ThreadWelcomeSuggestionContainer = styled("div", {
  className: "aui-thread-welcome-suggestion-container",
});

const ThreadWelcomeSuggestionStyled = styled(ThreadPrimitive.Suggestion, {
  className: "aui-thread-welcome-suggestion",
});

export type ThreadWelcomeSuggestionProps = {
  suggestion: SuggestionConfig;
};

export const ThreadWelcomeSuggestion: FC<ThreadWelcomeSuggestionProps> = ({
  suggestion: { text, prompt },
}) => {
  return (
    <ThreadWelcomeSuggestionStyled
      prompt={prompt ?? text}
      method="replace"
      autoSend
    >
      <span className="aui-thread-welcome-suggestion-text">{text}</span>
    </ThreadWelcomeSuggestionStyled>
  );
};

export const ThreadWelcomeSuggestions: FC = () => {
  const { welcome: { suggestions } = {} } = useThreadConfig();
  return (
    <ThreadWelcomeSuggestionContainer>
      {suggestions?.map((suggestion, idx) => {
        const key = `${suggestion.prompt}-${idx}`;
        return <ThreadWelcomeSuggestion key={key} suggestion={suggestion} />;
      })}
    </ThreadWelcomeSuggestionContainer>
  );
};

ThreadWelcomeSuggestions.displayName = "ThreadWelcomeSuggestions";
