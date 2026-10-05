import { PreviewChat } from "../../bundle-shared/chat";
import "./styles.css";

export default function App() {
  return (
    <main className="chat-example">
      <div className="chat-example-note">
        <span>assistant-ui / AI SDK</span>
        <p>A complete conversation surface</p>
      </div>
      <div className="chat-example-stage">
        <PreviewChat
          title="AI SDK chat"
          intro="What would you like to build?"
          suggestions={[
            "How is this chat connected?",
            "What can I customize?",
            "How do I add a real model?",
          ]}
          onPrompt={(text) => {
            if (/\b(model|backend|real|keys?)\b/i.test(text))
              return "This preview uses a local scripted transport. In your app, pass an AI SDK DefaultChatTransport to useChatRuntime and point it at your chat route. The existing with-ai-sdk-v7 example streams from a provider using streamText. Keep provider keys on the server.";
            if (/custom|style|component/i.test(text))
              return "This chat uses the assistant-ui shadcn Thread template and shared design system. The template includes the composer, Markdown messages, message actions, editing, and branch controls. Customize these components in your project while the runtime handles message state and streaming.";
            return "This conversation runs through useChatRuntime from @assistant-ui/ai-sdk. A browser-local AI SDK message stream supplies scripted replies. Try sending another message, copying this reply, or regenerating it. Connect the existing AI SDK example backend for live model responses.";
          }}
        />
      </div>
    </main>
  );
}
