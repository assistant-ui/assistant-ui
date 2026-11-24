import { DocsRuntimeProvider } from "@/runtimes/docs";
import { Codex } from "./codex";

/*
 * The preview chats with the model behind this site's own chat route, through
 * the runtime the docs examples use. In your app, replace the provider with a
 * runtime of your own, such as `useChatRuntime` inside an
 * `AssistantRuntimeProvider`.
 */
export default function Page() {
  return (
    <DocsRuntimeProvider devtools={false}>
      <Codex />
    </DocsRuntimeProvider>
  );
}
