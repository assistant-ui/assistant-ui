// @vitest-environment jsdom

import { StrictMode, version } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTapHost } from "@assistant-ui/tap";
import {
  useNotificationManager,
  type NotificationManager,
} from "./NotificationManager";

const onReact18 = version.startsWith("18.");

afterEach(() => {
  cleanup();
});

describe("compiled useNotificationManager", () => {
  // React 18's StrictMode mount replay starts from fresh hook state (React 19 reuses the first pass's), so it creates a second owner in development.
  it.skipIf(onReact18)(
    "keeps one state owner across a StrictMode render replay",
    () => {
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
    },
  );
});
