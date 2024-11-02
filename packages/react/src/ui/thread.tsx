"use client";

import { ComponentType, forwardRef, type FC } from "react";
import { ArrowDownIcon } from "lucide-react";

import { withDefaults } from "./utils/withDefaults";
import Composer from "./composer";
import ThreadWelcome from "./thread-welcome";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import AssistantMessage from "./assistant-message";
import UserMessage from "./user-message";
import EditComposer from "./edit-composer";
import {
  ThreadConfig,
  ThreadConfigProvider,
  ThreadConfigProviderProps,
  useThreadConfig,
} from "./thread-config";
import { ThreadPrimitive } from "../primitives";
import { useThread } from "../context";

const Thread: FC<ThreadConfig> = (config) => {
  const {
    components: {
      Composer: ComposerComponent = Composer,
      ThreadWelcome: ThreadWelcomeComponent = ThreadWelcome,
    } = {},
  } = config;
  return (
    <ThreadRoot config={config}>
      <ThreadViewport>
        <ThreadWelcomeComponent />
        <ThreadMessages />
        <ThreadFollowupSuggestions />
        <ThreadViewportFooter>
          <ThreadScrollToBottom />
          <ComposerComponent />
        </ThreadViewportFooter>
      </ThreadViewport>
    </ThreadRoot>
  );
};

namespace ThreadRoot {
  export type Element = HTMLDivElement;
  export type Props = ThreadPrimitive.Root.Props & ThreadConfigProviderProps;
}

const ThreadRootStyled = withDefaults(ThreadPrimitive.Root, {
  className: "aui-root aui-thread-root",
});

const ThreadRoot = forwardRef<ThreadRoot.Element, ThreadRoot.Props>(
  ({ config, ...props }, ref) => {
    return (
      <ThreadConfigProvider config={config}>
        <ThreadRootStyled {...props} ref={ref} />
      </ThreadConfigProvider>
    );
  },
);

ThreadRoot.displayName = "ThreadRoot";

const ThreadViewport = withDefaults(ThreadPrimitive.Viewport, {
  className: "aui-thread-viewport",
});

ThreadViewport.displayName = "ThreadViewport";

const ThreadViewportFooter = withDefaults("div", {
  className: "aui-thread-viewport-footer",
});

ThreadViewportFooter.displayName = "ThreadViewportFooter";

const SystemMessage = () => null;

const ThreadMessages: FC<{
  unstable_flexGrowDiv?: boolean;
  components?: {
    UserMessage?: ComponentType | undefined;
    EditComposer?: ComponentType | undefined;
    AssistantMessage?: ComponentType | undefined;
    SystemMessage?: ComponentType | undefined;
  };
}> = ({ components, unstable_flexGrowDiv: flexGrowDiv = true, ...rest }) => {
  return (
    <>
      <ThreadPrimitive.Messages
        components={{
          UserMessage: components?.UserMessage ?? UserMessage,
          EditComposer: components?.EditComposer ?? EditComposer,
          AssistantMessage: components?.AssistantMessage ?? AssistantMessage,
          SystemMessage: components?.SystemMessage ?? SystemMessage,
        }}
        {...rest}
      />
      {flexGrowDiv && (
        <ThreadPrimitive.If empty={false}>
          <div style={{ flexGrow: 1 }} />
        </ThreadPrimitive.If>
      )}
    </>
  );
};

ThreadMessages.displayName = "ThreadMessages";

const ThreadFollowupSuggestions: FC = () => {
  const suggestions = useThread((t) => t.suggestions);

  return (
    <ThreadPrimitive.If empty={false} running={false}>
      <div className="aui-thread-followup-suggestions">
        {suggestions?.map((suggestion, idx) => (
          <ThreadPrimitive.Suggestion
            key={idx}
            className="aui-thread-followup-suggestion"
            prompt={suggestion.prompt}
            method="replace"
            autoSend
          >
            {suggestion.prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </ThreadPrimitive.If>
  );
};

const ThreadScrollToBottomIconButton = withDefaults(TooltipIconButton, {
  variant: "outline",
  className: "aui-thread-scroll-to-bottom",
});

namespace ThreadScrollToBottom {
  export type Element = HTMLButtonElement;
  export type Props = Partial<TooltipIconButtonProps>;
}

const ThreadScrollToBottom = forwardRef<
  ThreadScrollToBottom.Element,
  ThreadScrollToBottom.Props
>((props, ref) => {
  const {
    strings: {
      thread: { scrollToBottom: { tooltip = "Scroll to bottom" } = {} } = {},
    } = {},
  } = useThreadConfig();
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <ThreadScrollToBottomIconButton tooltip={tooltip} {...props} ref={ref}>
        {props.children ?? <ArrowDownIcon />}
      </ThreadScrollToBottomIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
});

ThreadScrollToBottom.displayName = "ThreadScrollToBottom";

const exports = {
  Root: ThreadRoot,
  Viewport: ThreadViewport,
  Messages: ThreadMessages,
  FollowupSuggestions: ThreadFollowupSuggestions,
  ScrollToBottom: ThreadScrollToBottom,
  ViewportFooter: ThreadViewportFooter,
};

export default Object.assign(Thread, exports) as typeof Thread & typeof exports;
