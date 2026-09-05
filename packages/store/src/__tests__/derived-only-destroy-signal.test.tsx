// @vitest-environment jsdom

import { useRef, useState } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import { Derived } from "../Derived";
import { useAui } from "../useAui";
import type { AssistantClient } from "../types/client";
import { getClientDestroySignal } from "../utils/tap-assistant-context";

afterEach(cleanup);

const useThreadClient = () => {
  const [selected] = useState(0);
  const message = useRef({ getState: () => ({ id: "m0" }) }).current;
  return {
    getState: () => ({ selected }),
    message: () => message,
  };
};
const ThreadClient = resource(useThreadClient);

describe("derived-only providers", () => {
  it("do no signal work and resolve the owning host's signal on read", () => {
    let host!: AssistantClient;
    let derived!: AssistantClient;
    const Host = () => {
      host = useAui();
      return null;
    };
    const Inner = () => {
      derived = useAui();
      return null;
    };
    const Message = () => {
      const aui = useAui();
      const config = AuiConfig({
        message: Derived({
          source: "thread",
          query: {},
          get: (client) => client.thread.message(),
        } as never),
      });
      return (
        <AuiProvider extends={aui} config={config}>
          <Inner />
        </AuiProvider>
      );
    };

    const view = render(
      <AuiProvider config={AuiConfig({ thread: ThreadClient() } as never)}>
        <Host />
      </AuiProvider>,
    );
    const hostSignal = getClientDestroySignal(host)!;
    expect(hostSignal).toBeDefined();
    const addListener = vi.spyOn(hostSignal, "addEventListener");

    view.rerender(
      <AuiProvider config={AuiConfig({ thread: ThreadClient() } as never)}>
        <Host />
        <Message />
      </AuiProvider>,
    );

    expect(addListener).not.toHaveBeenCalled();
    expect(getClientDestroySignal(derived)).toBe(hostSignal);
  });
});
