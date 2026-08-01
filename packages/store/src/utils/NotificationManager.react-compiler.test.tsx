// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTapHost } from "@assistant-ui/tap";
import {
  useNotificationManager,
  type NotificationManager,
} from "./NotificationManager";

afterEach(() => {
  cleanup();
});

describe("compiled useNotificationManager", () => {
  it("keeps one state owner across a StrictMode render replay", () => {
    const instances: NotificationManager[] = [];

    function Harness() {
      useTapHost(function NotificationHost() {
        instances.push(useNotificationManager());
        return null;
      });
      return null;
    }

    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    expect(instances.length).toBeGreaterThanOrEqual(2);
    expect(new Set(instances)).toHaveLength(1);
  });
});
