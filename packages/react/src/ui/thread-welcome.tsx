"use client";

import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { withDefaults } from "./utils/withDefaults";
import { Avatar } from "./base/avatar";
import { SuggestionConfig, useThreadConfig } from "./thread-config";
import { ThreadPrimitive } from "../primitives";

const ThreadWelcome: FC = () => {
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

const ThreadWelcomeRootStyled = withDefaults("div", {
  className: "aui-thread-welcome-root",
});

const ThreadWelcomeCenter = withDefaults("div", {
  className: "aui-thread-welcome-center",
});

type ThreadWelcomeRootProps = ComponentPropsWithoutRef<"div">;

const ThreadWelcomeRoot = forwardRef<HTMLDivElement, ThreadWelcomeRootProps>(
  (props, ref) => {
    return (
      <ThreadPrimitive.Empty>
        <ThreadWelcomeRootStyled {...props} ref={ref} />
      </ThreadPrimitive.Empty>
    );
  },
);

ThreadWelcomeRoot.displayName = "ThreadWelcomeRoot";

const ThreadWelcomeAvatar: FC = () => {
  const { assistantAvatar: avatar = { fallback: "A" } } = useThreadConfig();
  return <Avatar {...avatar} />;
};

const ThreadWelcomeMessageStyled = withDefaults("p", {
  className: "aui-thread-welcome-message",
});

export type ThreadWelcomeMessageProps = Omit<
  ComponentPropsWithoutRef<typeof ThreadWelcomeMessageStyled>,
  "children"
> & { message?: string | undefined };

const ThreadWelcomeMessage = forwardRef<
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

const ThreadWelcomeSuggestionContainer = withDefaults("div", {
  className: "aui-thread-welcome-suggestion-container",
});

const ThreadWelcomeSuggestionStyled = withDefaults(ThreadPrimitive.Suggestion, {
  className: "aui-thread-welcome-suggestion",
});

export type ThreadWelcomeSuggestionProps = {
  suggestion: SuggestionConfig;
};

const ThreadWelcomeSuggestion: FC<ThreadWelcomeSuggestionProps> = ({
  suggestion: { text, prompt },
}) => {
  return (
    <ThreadWelcomeSuggestionStyled
      prompt={prompt}
      method="replace"
      autoSend
    >
      <span className="aui-thread-welcome-suggestion-text">{text ?? prompt}</span>
    </ThreadWelcomeSuggestionStyled>
  );
};

const ThreadWelcomeSuggestions: FC = () => {
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

const exports = {
  Root: ThreadWelcomeRoot,
  Center: ThreadWelcomeCenter,
  Avatar: ThreadWelcomeAvatar,
  Message: ThreadWelcomeMessage,
  Suggestions: ThreadWelcomeSuggestions,
  Suggestion: ThreadWelcomeSuggestion,
};

export default Object.assign(ThreadWelcome, exports) as typeof ThreadWelcome &
  typeof exports;
