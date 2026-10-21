import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import { resource, useResource } from "@assistant-ui/tap";
import { ExternalThread } from "@assistant-ui/core/store";
import { ThreadMessagesFlatList } from "./ThreadMessages";
import { ThreadRowsFlatList } from "./ThreadRowsFlatList";

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  return {
    ...actual,
    FlatList: React.forwardRef(function FlatListHost(
      { ListEmptyComponent }: { ListEmptyComponent: ReactNode },
      _ref,
    ) {
      return ListEmptyComponent;
    }),
  };
});

const StandaloneThread = resource(function useStandaloneThread() {
  return useResource(ExternalThread({ messages: [] }));
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe.each(["messages", "rows"] as const)(
  "%s flat list thread scopes",
  (kind) => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    it.each(["standalone", "with thread list"] as const)(
      "renders an empty %s thread",
      async (scope) => {
        const empty = <output>Conversation ready</output>;
        await act(async () => {
          root.render(
            <AuiProvider
              config={AuiConfig({
                thread:
                  scope === "standalone"
                    ? StandaloneThread()
                    : ExternalThread({ messages: [] }),
              })}
            >
              {kind === "messages" ? (
                <ThreadMessagesFlatList
                  components={{ Message: () => null }}
                  ListEmptyComponent={empty}
                />
              ) : (
                <ThreadRowsFlatList ListEmptyComponent={empty}>
                  {() => null}
                </ThreadRowsFlatList>
              )}
            </AuiProvider>,
          );
        });

        expect(container.textContent).toBe("Conversation ready");
      },
    );
  },
);
