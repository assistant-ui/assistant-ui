"use client";

import {
  ChatPanel,
  ChatPanelAssistantMessage,
  ChatPanelComposer,
  ChatPanelMessages,
  ChatPanelTyping,
  ChatPanelUserMessage,
} from "@/components/assistant-ui/elements/chat-panel";
import { StreamingText } from "@/components/assistant-ui/elements/streaming-text";
import { defineStates } from "./types";

const noop = () => {};

const QUESTION = "Why did my draft disappear?";
const ANSWER =
  "Drafts were living in component state, so switching threads reset them. The runtime now keys every draft by thread id and restores it when you come back.";
const SEGMENTS = [{ text: ANSWER }];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty",
    note: "A new panel with no messages yet.",
    Component: () => (
      <ChatPanel>
        <ChatPanelMessages />
        <ChatPanelComposer placeholder="Message" onSend={noop} />
      </ChatPanel>
    ),
  },
  {
    key: "pending",
    label: "Typing",
    note: "The question is sent and the reply has not started.",
    Component: () => (
      <ChatPanel>
        <ChatPanelMessages>
          <ChatPanelUserMessage>{QUESTION}</ChatPanelUserMessage>
          <ChatPanelTyping />
        </ChatPanelMessages>
        <ChatPanelComposer placeholder="Message" onSend={noop} />
      </ChatPanel>
    ),
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "The reply is partway through streaming in.",
    Component: () => (
      <ChatPanel>
        <ChatPanelMessages>
          <ChatPanelUserMessage>{QUESTION}</ChatPanelUserMessage>
          <StreamingText
            segments={SEGMENTS}
            count={14}
            streaming
            className="text-foreground/70 min-h-0 max-w-[85%] self-start text-xs"
          />
        </ChatPanelMessages>
        <ChatPanelComposer placeholder="Message" onSend={noop} />
      </ChatPanel>
    ),
  },
  {
    key: "disabled",
    label: "Send disabled",
    note: "Without a send handler the send button is disabled.",
    Component: () => (
      <ChatPanel>
        <ChatPanelMessages>
          <ChatPanelUserMessage>{QUESTION}</ChatPanelUserMessage>
          <ChatPanelAssistantMessage>{ANSWER}</ChatPanelAssistantMessage>
        </ChatPanelMessages>
        <ChatPanelComposer placeholder="Message" />
      </ChatPanel>
    ),
  },
  {
    key: "overflow",
    label: "Long thread",
    note: "More messages than fit, so the list scrolls above the composer.",
    Component: () => (
      <ChatPanel>
        <ChatPanelMessages>
          <ChatPanelUserMessage>{QUESTION}</ChatPanelUserMessage>
          <ChatPanelAssistantMessage>{ANSWER}</ChatPanelAssistantMessage>
          <ChatPanelUserMessage>
            Does that cover threads loaded from the server?
          </ChatPanelUserMessage>
          <ChatPanelAssistantMessage>
            Yes. Remote threads use the same key, so a draft written before a
            reload comes back once the thread list hydrates.
          </ChatPanelAssistantMessage>
          <ChatPanelUserMessage>
            And if two tabs edit the same thread?
          </ChatPanelUserMessage>
          <ChatPanelAssistantMessage>
            The last write wins. Each tab saves on blur, so the tab you leave
            last sets the draft the other one sees.
          </ChatPanelAssistantMessage>
        </ChatPanelMessages>
        <ChatPanelComposer placeholder="Message" onSend={noop} />
      </ChatPanel>
    ),
  },
]);
