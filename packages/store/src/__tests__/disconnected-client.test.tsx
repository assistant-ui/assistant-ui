// @vitest-environment jsdom

import { Activity, StrictMode, useEffect, type ReactNode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useClientLookup } from "../useClientLookup";

const runtime = vi.hoisted(() => ({
  send: vi.fn(),
  remove: vi.fn(),
  delete: vi.fn(),
  cancelRun: vi.fn(),
}));

const accessors = [
  "composer",
  "message",
  "part",
  "attachment",
  "item",
  "queueItem",
  "thread",
  "suggestions",
  "suggestion",
  "task",
  "child",
  "server",
  "connector",
  "customServer",
] as const;

type ResourceProps = {
  label: string;
  listeners: Set<() => void>;
};

const useActionItem = ({
  id,
  label,
  listeners,
}: ResourceProps & { id: string }) => ({
  getState: () => ({ id, label }),
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  send: runtime.send,
  remove: runtime.remove,
  delete: runtime.delete,
});
const ActionItem = resource(useActionItem);

const useActionThread = (props: ResourceProps) => {
  const items = useClientLookup([
    withKey("message", ActionItem({ ...props, id: "message" })),
    withKey("second", ActionItem({ ...props, id: "second" })),
  ]);
  const child = () => items.get({ key: "message" });
  return {
    getState: () => ({ messages: items.state }),
    composer: child,
    message: ({ id }: { id: string }) => items.get({ key: id }),
    part: child,
    attachment: child,
    item: child,
    queueItem: child,
    thread: child,
    suggestions: child,
    suggestion: child,
    task: child,
    child,
    server: child,
    connector: child,
    customServer: child,
    cancelRun: runtime.cancelRun,
  };
};
const ActionThread = resource(useActionThread);

type TestClient = { thread: ReturnType<typeof useActionThread> };

const LegacyProvider = ({
  config,
  children,
}: {
  config: AuiConfig;
  children: ReactNode;
}) => {
  const aui = useAui(config);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

const setup = (host: "config" | "legacy", strict = false, cancel = false) => {
  let aui!: TestClient;
  const listeners = new Set<() => void>();
  const Provider = host === "config" ? AuiProvider : LegacyProvider;
  const Capture = () => {
    const client = useAui();
    aui = client as unknown as TestClient;
    useEffect(() => {
      if (!cancel) return;
      return () => (client as unknown as TestClient).thread.cancelRun();
    }, [client]);
    return null;
  };
  const tree = (mode: "visible" | "hidden", label: string) => {
    const config = AuiConfig({
      thread: ActionThread({ label, listeners }),
    } as unknown as AuiConfig.Input);
    const content = (
      <Activity mode={mode}>
        <Provider config={config}>
          <Capture />
        </Provider>
      </Activity>
    );
    return strict ? <StrictMode>{content}</StrictMode> : content;
  };
  const view = render(tree("visible", "initial"));
  return {
    aui,
    listeners,
    unmount: view.unmount,
    update: (mode: "visible" | "hidden", label = "initial") =>
      view.rerender(tree(mode, label)),
  };
};

beforeEach(() => {
  for (const callback of Object.values(runtime)) {
    callback.mockReset().mockReturnValue("dispatched");
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each(["config", "legacy"] as const)(
  "disconnected %s client",
  (host) => {
    it.each(["unmount", "hide"] as const)(
      "denies captured send, remove and delete after %s and warns once per method and proxy",
      async (teardown) => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const fixture = setup(host);
        const client = fixture.aui.thread.message({ id: "message" });
        const second = fixture.aui.thread.message({ id: "second" });
        const captured = {
          send: client.send,
          remove: client.remove,
          delete: client.delete,
        };

        if (teardown === "unmount") fixture.unmount();
        else fixture.update("hidden");
        await act(async () => {});

        for (const name of ["send", "remove", "delete"] as const) {
          expect(client[name]).toBe(captured[name]);
        }
        expect(warn).not.toHaveBeenCalled();

        for (const name of ["send", "remove", "delete"] as const) {
          expect(captured[name]()).toBeUndefined();
          expect(captured[name]()).toBeUndefined();
          expect(runtime[name]).not.toHaveBeenCalled();
          expect(
            warn.mock.calls.filter(([message]) =>
              message.includes(`"${name}"`),
            ),
          ).toHaveLength(1);
        }
        expect(warn).toHaveBeenCalledTimes(3);
        expect(second.send()).toBeUndefined();
        expect(second.send()).toBeUndefined();
        expect(runtime.send).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(4);
      },
    );

    it("keeps every child accessor and real state readable while denying chained actions", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fixture = setup(host);
      fixture.update("visible", "committed");
      const client = fixture.aui.thread.message({ id: "message" });
      fixture.unmount();
      await act(async () => {});

      for (const name of accessors) {
        expect(fixture.aui.thread[name]({ id: "message" })).toBe(client);
      }
      expect(fixture.aui.thread.message({ id: "message" }).getState()).toEqual({
        id: "message",
        label: "committed",
      });
      expect(warn).not.toHaveBeenCalled();
      expect(
        fixture.aui.thread.message({ id: "message" }).delete(),
      ).toBeUndefined();
      expect(
        fixture.aui.thread.message({ id: "message" }).delete(),
      ).toBeUndefined();
      expect(runtime.delete).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it("keeps subscribe and existing and new unsubscribe callbacks working after disconnection", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fixture = setup(host);
      const client = fixture.aui.thread.message({ id: "message" });
      const before = vi.fn();
      const after = vi.fn();
      const unsubscribeBefore = client.subscribe(before);
      fixture.unmount();
      await act(async () => {});

      const unsubscribeAfter = client.subscribe(after);
      for (const listener of fixture.listeners) listener();
      expect(before).toHaveBeenCalledTimes(1);
      expect(after).toHaveBeenCalledTimes(1);
      unsubscribeBefore();
      for (const listener of fixture.listeners) listener();
      expect(before).toHaveBeenCalledTimes(1);
      expect(after).toHaveBeenCalledTimes(2);
      unsubscribeAfter();
      expect(fixture.listeners.size).toBe(0);
      expect(warn).not.toHaveBeenCalled();
    });

    it("guards descriptor values captured before and after disconnect without changing enumeration or identity", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fixture = setup(host);
      const client = fixture.aui.thread.message({ id: "message" });
      const before = Object.getOwnPropertyDescriptor(client, "send")!;
      const send = client.send;
      const keys = ["getState", "subscribe", "send", "remove", "delete"];
      expect(before).toEqual({
        value: send,
        enumerable: true,
        configurable: true,
        writable: false,
      });
      expect(before.value()).toBe("dispatched");
      expect(runtime.send).toHaveBeenCalledTimes(1);
      const spreadBefore = { ...client };
      fixture.unmount();
      await act(async () => {});

      const after = Object.getOwnPropertyDescriptor(client, "send")!;
      const spreadAfter = { ...client };
      expect(Object.keys(client)).toEqual(keys);
      expect(Object.keys(spreadBefore)).toEqual(keys);
      expect(Object.keys(spreadAfter)).toEqual(keys);
      expect(Reflect.ownKeys(client)).toEqual(keys);
      expect(after).toEqual(before);
      expect(client.send).toBe(send);
      expect(spreadBefore.send).toBe(send);
      expect(spreadAfter.send).toBe(send);
      expect(warn).not.toHaveBeenCalled();
      for (const method of [
        before.value,
        after.value,
        spreadBefore.send,
        spreadAfter.send,
      ]) {
        expect(method()).toBeUndefined();
      }
      expect(runtime.send).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])(
      "allows descendant cleanup cancellation with StrictMode=%s",
      async (strict) => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const fixture = setup(host, strict, true);
        await act(async () => {});
        expect(runtime.cancelRun).toHaveBeenCalledTimes(strict ? 1 : 0);
        const send = fixture.aui.thread.composer().send;
        expect(send()).toBe("dispatched");
        fixture.unmount();
        expect(runtime.cancelRun).toHaveBeenCalledTimes(strict ? 2 : 1);
        expect(warn).not.toHaveBeenCalled();
        await act(async () => {});
        expect(warn).not.toHaveBeenCalled();
        expect(send()).toBeUndefined();
        expect(runtime.send).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
      },
    );

    it("reconnects the same cached methods after Activity is shown under StrictMode", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fixture = setup(host, true, true);
      const client = fixture.aui.thread.composer();
      const send = client.send;
      await act(async () => {});
      expect(send()).toBe("dispatched");
      fixture.update("hidden");
      expect(runtime.cancelRun).toHaveBeenCalledTimes(2);
      expect(warn).not.toHaveBeenCalled();
      await act(async () => {});
      expect(send()).toBeUndefined();
      fixture.update("visible");
      await act(async () => {});
      expect(fixture.aui.thread.composer()).toBe(client);
      expect(client.send).toBe(send);
      expect(send()).toBe("dispatched");
      expect(runtime.send).toHaveBeenCalledTimes(2);
      fixture.update("hidden");
      await act(async () => {});
      expect(send()).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  },
);
