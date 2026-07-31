// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource, useResource } from "@assistant-ui/tap";
import { useNotificationManager } from "./NotificationManager";

afterEach(() => {
  cleanup();
});

describe("compiled useNotificationManager", () => {
  it("keeps subscriptions connected across pre-commit render replays", () => {
    const managers: ReturnType<typeof useNotificationManager>[] = [];

    const useManager = () => {
      const manager = useNotificationManager();
      managers.push(manager);
      return manager;
    };
    const Manager = resource(useManager);

    const App = () => {
      useResource(Manager());
      return null;
    };

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(managers.length).toBeGreaterThan(1);

    const subscriber = vi.fn();
    managers[0]!.subscribe(subscriber);
    managers.at(-1)!.notifySubscribers();

    expect(subscriber).toHaveBeenCalledOnce();
  });
});
