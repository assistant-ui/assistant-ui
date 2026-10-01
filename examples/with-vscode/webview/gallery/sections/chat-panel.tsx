import {
  ChatPanel,
  ChatPanelAssistantMessage,
  ChatPanelComposer,
  ChatPanelMessages,
  ChatPanelTyping,
  ChatPanelUserMessage,
} from "@assistant-ui/ui/components/assistant-ui/elements/chat-panel.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "chat-panel",
    title: "Chat panel",
    category: "chat",
    notes:
      "chat-panel.tsx (standalone): a user message, an answer, a follow-up with the typing indicator, and the composer.",
    render: () => (
      <ChatPanel>
        <ChatPanelMessages>
          <ChatPanelUserMessage>
            Why did my draft disappear?
          </ChatPanelUserMessage>
          <ChatPanelAssistantMessage>
            Drafts were living in component state, so switching threads reset
            them. The runtime now keys every draft by thread id.
          </ChatPanelAssistantMessage>
          <ChatPanelUserMessage>Does it survive a reload?</ChatPanelUserMessage>
          <ChatPanelTyping />
        </ChatPanelMessages>
        <ChatPanelComposer placeholder="Message" onSend={() => {}} />
      </ChatPanel>
    ),
  },
]);
