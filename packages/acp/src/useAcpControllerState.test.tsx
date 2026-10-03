// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { StrictMode, act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AcpThreadController } from "./AcpThreadController";
import { useAcpControllerState } from "./useAcpControllerState";
import { EMPTY_ACP_THREAD_STATE, type AcpThreadState } from "./acpThreadState";
import type { AcpClient } from "./AcpClient";
import type { AcpSessionUpdate } from "./types";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type SessionUpdateHandler = (
  sessionId: string,
  update: AcpSessionUpdate,
) => void;

class StubClient {
  connectionState = "disconnected";
  sessionId: string | undefined = undefined;
  agentInfo: undefined = undefined;
  agentCapabilities: undefined = undefined;
  permissionHandler: unknown = undefined;
  hasConfiguredPermissionHandler = false;

  private readonly sessionUpdateListeners = new Set<SessionUpdateHandler>();

  subscribeSessionUpdate(listener: SessionUpdateHandler) {
    this.sessionUpdateListeners.add(listener);
    return () => {
      this.sessionUpdateListeners.delete(listener);
    };
  }

  subscribeConnectionChange(_listener: (state: string) => void) {
    return () => {};
  }

  async connect() {
    return { protocolVersion: 1, agentCapabilities: {} };
  }
  async prompt() {
    return "end_turn";
  }
  async cancel() {}

  emit(update: AcpSessionUpdate) {
    const sessionId = this.sessionId ?? "";
    for (const listener of [...this.sessionUpdateListeners]) {
      listener(sessionId, update);
    }
  }
}

let root: Root | undefined;

const mount = (controller: AcpThreadController, strict = false) => {
  const states: AcpThreadState[] = [];
  let renders = 0;
  const Probe = () => {
    renders += 1;
    states.push(useAcpControllerState(controller));
    return null;
  };
  const container = document.createElement("div");
  root = createRoot(container);
  act(() => {
    root!.render(
      strict
        ? createElement(StrictMode, null, createElement(Probe))
        : createElement(Probe),
    );
  });
  return { states, renders: () => renders };
};

const controllerFor = (client: StubClient) =>
  new AcpThreadController({
    client: client as unknown as AcpClient,
    autoConnect: false,
  });

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

describe("useAcpControllerState", () => {
  it("returns the empty state before anything happens", () => {
    const { states } = mount(controllerFor(new StubClient()));
    expect(states.at(-1)).toBe(EMPTY_ACP_THREAD_STATE);
  });

  it("re-renders when the controller dispatches an event", async () => {
    const client = new StubClient();
    const controller = controllerFor(client);
    const { states, renders } = mount(controller);
    await act(async () => {
      await controller.attach();
    });

    act(() => {
      client.emit({ sessionUpdate: "session_info_update", title: "Streaming" });
    });
    expect(states.at(-1)?.sessionTitle).toBe("Streaming");
    expect(renders()).toBeGreaterThan(1);
  });

  it("keeps the subscription across an event-driven re-render", async () => {
    const client = new StubClient();
    const controller = controllerFor(client);
    const { states } = mount(controller);
    await act(async () => {
      await controller.attach();
    });

    act(() => {
      client.emit({ sessionUpdate: "session_info_update", title: "one" });
      client.emit({ sessionUpdate: "session_info_update", title: "two" });
      client.emit({ sessionUpdate: "session_info_update", title: "three" });
    });

    expect(states.at(-1)?.sessionTitle).toBe("three");
    expect(states.filter((s) => s.sessionTitle === "three")).toHaveLength(1);
  });

  it("stops re-rendering after unmount", async () => {
    const client = new StubClient();
    const controller = controllerFor(client);
    const { renders } = mount(controller);
    await act(async () => {
      await controller.attach();
    });

    act(() => root?.unmount());
    root = undefined;
    const renderedBeforeEmit = renders();

    client.emit({ sessionUpdate: "session_info_update", title: "after" });
    expect(controller.getState().sessionTitle).toBe("after");
    expect(renders()).toBe(renderedBeforeEmit);
  });

  it("survives a StrictMode double mount", async () => {
    const client = new StubClient();
    const controller = controllerFor(client);
    const { states } = mount(controller, true);
    await act(async () => {
      await controller.attach();
    });

    act(() => {
      client.emit({ sessionUpdate: "session_info_update", title: "strict" });
    });
    expect(states.at(-1)?.sessionTitle).toBe("strict");
  });
});
