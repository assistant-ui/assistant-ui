"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AuiConfig,
  AuiProvider,
  useAui,
  type AssistantClient,
} from "@assistant-ui/store";
import { resource } from "@assistant-ui/tap";
import { ReadonlyThreadProvider } from "@assistant-ui/core/react";
import type { ThreadMessage } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "../legacy-runtime/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime";

const CHANNEL = "assistant-ui/cloud-renderer";

const toOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
};
const DEFAULT_ALLOWED_ORIGINS = ["https://cloud.assistant-ui.com"];
const INERT_STORE = {
  messages: [] as ThreadMessage[],
  isDisabled: true,
  onNew: async () => {},
};

type HostMessage =
  | { channel: typeof CHANNEL; version: 1; type: "ready" }
  | { channel: typeof CHANNEL; version: 1; type: "size"; height: number }
  | { channel: typeof CHANNEL; version: 1; type: "error"; message: string };

export type CloudRendererHostProps = {
  /** The app's thread UI, usually its own `<Thread />`. */
  children: ReactNode;
  /** Dashboard origins allowed to send a conversation. Defaults to Assistant Cloud's dashboard. */
  allowedOrigins?: readonly string[] | undefined;
  /** The same client or config the app passes to AssistantRuntimeProvider, so tool UIs, data UIs and generative UI render as they do in the app. */
  aui?: AssistantRuntimeProvider.Props["aui"];
  config?: AssistantRuntimeProvider.Props["config"];
};

class RenderBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

const useReadonlyTools = (aui: AssistantClient) => {
  const tools = useSyncExternalStore(aui.subscribe, aui.tools.getState);
  const state = useMemo(() => ({ ...tools, mcpApp: undefined }), [tools]);
  return {
    getState: () => state,
    setToolUI: aui.tools.setToolUI,
  };
};

const ReadonlyTools = resource(useReadonlyTools);

const SuppressMcpApps = ({ children }: { children: ReactNode }) => {
  const aui = useAui();
  return (
    <AuiProvider
      extends={aui}
      config={AuiConfig({ tools: ReadonlyTools(aui) })}
    >
      {children}
    </AuiProvider>
  );
};

const ReadonlyConversation = ({
  messages,
  children,
  aui,
  config,
}: {
  messages: readonly ThreadMessage[];
  children: ReactNode;
  aui: CloudRendererHostProps["aui"];
  config: CloudRendererHostProps["config"];
}) => {
  const runtime = useExternalStoreRuntime<ThreadMessage>(INERT_STORE);

  return (
    <AssistantRuntimeProvider
      runtime={runtime}
      {...(aui !== undefined && { aui })}
      {...(config !== undefined && { config })}
    >
      <SuppressMcpApps>
        <ReadonlyThreadProvider messages={messages}>
          {children}
        </ReadonlyThreadProvider>
      </SuppressMcpApps>
    </AssistantRuntimeProvider>
  );
};

export function CloudRendererHost({
  children,
  allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
  aui,
  config,
}: CloudRendererHostProps): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const connectedOrigin = useRef<string | null>(null);
  const [render, setRender] = useState<{
    messages: readonly ThreadMessage[];
    revision: number;
  } | null>(null);

  const originsKey = allowedOrigins
    .flatMap((value) => toOrigin(value) ?? [])
    .join(" ");

  useEffect(() => {
    const origins = originsKey ? originsKey.split(" ") : [];
    if (
      connectedOrigin.current !== null &&
      !origins.includes(connectedOrigin.current)
    ) {
      connectedOrigin.current = null;
    }
    const post = (origin: string, message: HostMessage) =>
      window.parent.postMessage(message, origin);

    for (const origin of origins) {
      post(origin, { channel: CHANNEL, version: 1, type: "ready" });
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || !origins.includes(event.origin))
        return;
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null) return;
      const message = data as Record<string, unknown>;
      if (
        message.channel !== CHANNEL ||
        message.version !== 1 ||
        message.type !== "render" ||
        !Array.isArray(message.messages)
      )
        return;
      if (
        connectedOrigin.current !== null &&
        connectedOrigin.current !== event.origin
      )
        return;

      connectedOrigin.current = event.origin;
      setRender((previous) => ({
        messages: message.messages as ThreadMessage[],
        revision: (previous?.revision ?? 0) + 1,
      }));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [originsKey]);

  useEffect(() => {
    if (!render || !rootRef.current) return;
    const root = rootRef.current;
    let frame = 0;
    const report = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const origin = connectedOrigin.current;
        const height = root.getBoundingClientRect().height;
        if (origin && Number.isFinite(height) && height >= 0) {
          window.parent.postMessage(
            { channel: CHANNEL, version: 1, type: "size", height },
            origin,
          );
        }
      });
    };
    const observer = new ResizeObserver(report);
    observer.observe(root);
    report();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [render]);

  const reportError = (error: Error) => {
    const origin = connectedOrigin.current;
    if (origin) {
      window.parent.postMessage(
        { channel: CHANNEL, version: 1, type: "error", message: error.message },
        origin,
      );
    }
  };

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (node) node.inert = true;
      }}
      style={{ width: "100%" }}
    >
      {render && (
        <RenderBoundary key={render.revision} onError={reportError}>
          <ReadonlyConversation
            messages={render.messages}
            aui={aui}
            config={config}
          >
            {children}
          </ReadonlyConversation>
        </RenderBoundary>
      )}
    </div>
  );
}
