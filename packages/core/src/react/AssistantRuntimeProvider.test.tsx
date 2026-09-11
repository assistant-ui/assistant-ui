// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import {
  AuiConfig,
  AuiProvider,
  useAui,
  type AssistantClient,
} from "@assistant-ui/store";
import type { ChatModelAdapter } from "../runtime/utils/chat-model-adapter";
import type { ThreadMessage } from "../types/message";
import { AssistantRuntimeProvider } from "./AssistantRuntimeProvider";
import { useLocalRuntime } from "./runtimes/useLocalRuntime";
import { useExternalStoreRuntime } from "./runtimes/useExternalStoreRuntime";

type AnyClient = Record<string, any>;

const chatModel: ChatModelAdapter = {
  run: async () => ({ content: [] }),
};

const hoistedConfig = AuiConfig({});

const message = (id: string, role: "user" | "assistant"): ThreadMessage =>
  ({
    id,
    role,
    content: [{ type: "text", text: `text of ${id}` }],
    createdAt: new Date(1718000000000),
    ...(role === "assistant"
      ? { status: { type: "complete", reason: "stop" } }
      : { attachments: [] }),
    metadata: { custom: {} },
  }) as ThreadMessage;

const makeCounterClient = (log?: string[]) => {
  const useCounterClient = () => {
    useEffect(() => {
      log?.push("parent tap effect");
    }, []);
    return { getState: () => ({ count: 0 }) };
  };
  return resource(useCounterClient);
};

afterEach(() => {
  cleanup();
});

describe("AssistantRuntimeProvider aui composition", () => {
  it("isolates from ambient context by default", () => {
    let aui!: AnyClient;
    const Consumer = () => {
      aui = useAui();
      return null;
    };

    const Ambient = ({ children }: { children: ReactNode }) => {
      const ambient = useAui({
        parentScope: makeCounterClient()(),
      } as unknown as useAui.Props);
      return <AuiProvider value={ambient}>{children}</AuiProvider>;
    };

    const App = () => {
      const runtime = useLocalRuntime(chatModel);
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Consumer />
        </AssistantRuntimeProvider>
      );
    };

    render(
      <Ambient>
        <App />
      </Ambient>,
    );

    expect(aui.threads).toBeDefined();
    expect(() => aui.parentScope.getState()).toThrow(
      /The current scope does not have a "parentScope" property/,
    );
  });

  it("inherits a prop-passed parent and mounts its effects", () => {
    const log: string[] = [];
    let aui!: AnyClient;
    const Consumer = () => {
      aui = useAui();
      useEffect(() => {
        log.push("consumer effect");
      }, []);
      return null;
    };

    const App = ({ parent }: { parent: AssistantClient }) => {
      const runtime = useLocalRuntime(chatModel);
      return (
        <AssistantRuntimeProvider runtime={runtime} aui={parent}>
          <Consumer />
        </AssistantRuntimeProvider>
      );
    };

    const Root = () => {
      const parent = useAui({
        parentScope: makeCounterClient(log)(),
      } as unknown as useAui.Props);
      return <App parent={parent} />;
    };

    render(<Root />);

    expect(aui.parentScope.getState()).toEqual({ count: 0 });
    expect(log).toEqual(["parent tap effect", "consumer effect"]);
  });

  it("provides config scopes alongside the runtime scope", () => {
    let aui!: AnyClient;
    const Consumer = () => {
      aui = useAui();
      return null;
    };

    const App = () => {
      const runtime = useLocalRuntime(chatModel);
      const config = AuiConfig({
        extraScope: makeCounterClient()(),
      } as unknown as AuiConfig.Input);
      return (
        <AssistantRuntimeProvider runtime={runtime} config={config}>
          <Consumer />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);

    expect(aui.threads).toBeDefined();
    expect(aui.extraScope.getState()).toEqual({ count: 0 });
  });

  it("keeps the runtime's threads scope when config carries a threads key", () => {
    let aui!: AnyClient;
    const Consumer = () => {
      aui = useAui();
      return null;
    };

    const App = () => {
      const runtime = useLocalRuntime(chatModel);
      const config = AuiConfig({
        threads: makeCounterClient()(),
      } as unknown as AuiConfig.Input);
      return (
        <AssistantRuntimeProvider runtime={runtime} config={config}>
          <Consumer />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);

    expect(aui.threads.getState().main).toBeDefined();
  });

  const countPublicationsOverThreeRerenders = async (
    makeMessages: () => ThreadMessage[],
  ) => {
    let advance!: () => void;
    let notifications = 0;

    const Subscriber = () => {
      const aui = useAui();
      useEffect(() => aui.subscribe(() => notifications++), [aui]);
      return null;
    };

    const App = () => {
      const [, setTick] = useState(0);
      advance = () => setTick((tick) => tick + 1);
      const runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: makeMessages(),
        onNew: async () => {},
      });

      return (
        <AssistantRuntimeProvider runtime={runtime} config={hoistedConfig}>
          <Subscriber />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    notifications = 0;

    await act(async () => advance());
    await act(async () => advance());
    await act(async () => advance());

    return notifications;
  };

  it("publishes once when the external-store runtime owner rerenders", async () => {
    expect(await countPublicationsOverThreeRerenders(() => [])).toBe(3);
  });

  it("publishes once per rerender when the thread already has messages", async () => {
    const messages = [message("m1", "user"), message("m2", "assistant")];
    expect(await countPublicationsOverThreeRerenders(() => [...messages])).toBe(
      3,
    );
  });
});
