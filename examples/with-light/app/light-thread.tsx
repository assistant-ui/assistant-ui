"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { ArrowDown, ArrowUp, Square } from "lucide-react";
import type { FC } from "react";

export const LightThread: FC = () => {
  return (
    <ThreadPrimitive.Root className="light-thread">
      <ThreadPrimitive.Viewport className="light-viewport">
        <ThreadPrimitive.Empty>
          <Welcome />
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.role === "user" ? <UserMessage /> : <AssistantMessage />
          }
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="composer-dock">
          <ThreadPrimitive.ScrollToBottom asChild>
            <button type="button" className="scroll-button">
              <ArrowDown size={16} />
            </button>
          </ThreadPrimitive.ScrollToBottom>
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const Welcome: FC = () => (
  <div className="welcome">
    <div className="welcome-copy">
      <p>
        What would feel
        <br />
        <em>lighter</em> after we talk?
      </p>
      <span className="welcome-orbit" aria-hidden="true" />
    </div>

    <div className="suggestion-grid">
      <ThreadPrimitive.Suggestions>
        {() => (
          <SuggestionPrimitive.Trigger className="suggestion-card" send>
            <SuggestionPrimitive.Title className="suggestion-title" />
            <SuggestionPrimitive.Description className="suggestion-description" />
          </SuggestionPrimitive.Trigger>
        )}
      </ThreadPrimitive.Suggestions>
    </div>
  </div>
);

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="message-row user-row">
    <div className="user-bubble">
      <MessagePrimitive.Parts>
        {({ part }) => (part.type === "text" ? <p>{part.text}</p> : null)}
      </MessagePrimitive.Parts>
    </div>
  </MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="message-row assistant-row">
    <span className="assistant-dot" aria-hidden="true" />
    <div className="assistant-copy">
      <MessagePrimitive.Parts>
        {({ part }) => {
          return part.type === "text" ? <p>{part.text}</p> : null;
        }}
      </MessagePrimitive.Parts>
    </div>
  </MessagePrimitive.Root>
);

const Composer: FC = () => (
  <ComposerPrimitive.Root className="light-composer">
    <ComposerPrimitive.Input
      className="composer-input"
      placeholder="Write what is on your mind..."
      aria-label="Message input"
      rows={1}
      autoFocus
    />
    <div className="composer-actions">
      <AuiIf condition={(state) => !state.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button
            className="send-button"
            type="button"
            aria-label="Send message"
          >
            <ArrowUp size={18} />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(state) => state.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button
            className="send-button"
            type="button"
            aria-label="Stop generating"
          >
            <Square size={13} fill="currentColor" />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  </ComposerPrimitive.Root>
);
