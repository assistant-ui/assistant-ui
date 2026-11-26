import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  InMemoryThreadListAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react-native";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { runScript } from "@/registry/shared/lib/demo-script";

/**
 * The runtime a native block runs on: the chat route at `api`, or the scripted
 * demo when there is none, which is what a fresh Expo app gets until
 * EXPO_PUBLIC_CHAT_API is set.
 */
export function NativeRuntimeProvider({
  api,
  children,
}: {
  api?: string | undefined;
  children: ReactNode;
}) {
  return api ? (
    <ChatRouteRuntimeProvider api={api}>{children}</ChatRouteRuntimeProvider>
  ) : (
    <NativeDemoRuntimeProvider>{children}</NativeDemoRuntimeProvider>
  );
}

function ChatRouteRuntimeProvider({
  api,
  children,
}: {
  api: string;
  children: ReactNode;
}) {
  const transport = useMemo(() => new AssistantChatTransport({ api }), [api]);
  const runtime = useChatRuntime({ transport });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

/** The scripted replies from demo-script, as a native runtime adapter. */
const scriptedAdapter: ChatModelAdapter = {
  run: (options) => runScript(options) as ReturnType<ChatModelAdapter["run"]>,
};

const EMPTY_CONFIG = AuiConfig({});

/**
 * Wraps a native block in the scripted runtime, with conversations kept in
 * memory. It starts from an empty scope, so it also works inside a page that
 * has an assistant of its own, like the library's block viewer.
 */
export function NativeDemoRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuiProvider extends={null} config={EMPTY_CONFIG}>
      <NativeDemoRuntime>{children}</NativeDemoRuntime>
    </AuiProvider>
  );
}

function NativeDemoRuntime({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => new InMemoryThreadListAdapter(), []);
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function NativeDemoThreadRuntime() {
      return useLocalRuntime(scriptedAdapter);
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
