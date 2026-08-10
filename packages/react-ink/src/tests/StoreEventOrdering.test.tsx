import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { resource } from "@assistant-ui/tap";
import {
  AuiConfig,
  AuiProvider,
  Derived,
  useAui,
  useAuiEvent,
  useAssistantEmit,
  useClientResource,
} from "@assistant-ui/store";

type AnyClient = Record<string, any>;

const useMessageClient = ({ id }: { id: string }) => {
  const emit = useAssistantEmit();
  const [text, setText] = useState("");
  return {
    getState: () => ({ id, text }),
    setText,
    ping: (value: string) =>
      emit("message.pinged" as never, { id, value } as never),
  };
};
const MessageClient = resource(useMessageClient);

const useThreadClient = () => {
  const m0 = useClientResource(MessageClient({ id: "m0" }));
  const m1 = useClientResource(MessageClient({ id: "m1" }));
  const messages = [m0, m1];
  return {
    getState: () => ({}),
    message: ({ index }: { index: number }) => messages[index]!.methods,
  };
};
const ThreadClient = resource(useThreadClient);

const ComposerClient = resource(() => ({ getState: () => ({}) }));

const HostedDerivedMessageProvider = ({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) => {
  const parent = useAui();
  const config = AuiConfig({
    composer: ComposerClient(),
    message: Derived({
      source: "thread",
      query: { index },
      get: (aui: AnyClient) => aui.thread.message({ index }),
    } as never),
  } as never);
  return (
    <AuiProvider extends={parent} config={config}>
      {children}
    </AuiProvider>
  );
};

afterEach(() => {
  cleanup();
});

describe("store event ordering in Ink", () => {
  it("publishes a hosted selection before descendant layout events flush", () => {
    let aui!: AnyClient;
    const cb = vi.fn();
    const queued: VoidFunction[] = [];
    const DrainLayoutMicrotasks = ({ children }: { children: ReactNode }) => {
      useLayoutEffect(() => {
        for (const task of queued.splice(0)) task();
      });
      return children;
    };
    const Listener = ({ index }: { index: number }) => {
      useAuiEvent("message.pinged" as never, cb as never);
      useLayoutEffect(() => {
        aui.thread.message({ index }).ping("layout");
      }, [index]);
      return null;
    };
    const RootContents = ({ index }: { index: number }) => {
      aui = useAui();
      return (
        <DrainLayoutMicrotasks>
          <HostedDerivedMessageProvider index={index}>
            <Listener index={index} />
          </HostedDerivedMessageProvider>
        </DrainLayoutMicrotasks>
      );
    };
    const Harness = ({ index }: { index: number }) => {
      const config = AuiConfig({ thread: ThreadClient() } as never);
      return (
        <AuiProvider config={config}>
          <RootContents index={index} />
        </AuiProvider>
      );
    };
    const queueSpy = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((task) => queued.push(task));
    try {
      const view = render(<Harness index={0} />);
      cb.mockClear();

      view.rerender(<Harness index={1} />);

      expect(cb).toHaveBeenCalledExactlyOnceWith({
        id: "m1",
        value: "layout",
      });
    } finally {
      queueSpy.mockRestore();
    }
  });
});
