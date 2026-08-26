// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { useResource } from "@assistant-ui/tap";
import {
  startTransition,
  Suspense,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
import type { McpAppsHost } from "./types";
import { McpAppsRemoteHost } from "./McpAppsRemoteHost";

describe("McpAppsRemoteHost concurrent rendering", () => {
  it("keeps committed authorization options during an interrupted render", async () => {
    const pending = new Promise<never>(() => {});
    const fetch = vi.fn(async () => Response.json({ content: [] }));
    let committedHost: McpAppsHost | undefined;

    const Probe = ({
      authorization,
      suspend,
      children,
    }: {
      authorization: string;
      suspend: boolean;
      children: ReactNode;
    }) => {
      const host = useResource(
        McpAppsRemoteHost({
          url: "/api/mcp-apps",
          fetch,
          headers: { authorization },
        }),
      );
      useLayoutEffect(() => {
        committedHost = host;
      }, [host]);
      if (suspend) throw pending;
      return children;
    };

    const view = render(
      <Suspense fallback={null}>
        <Probe authorization="Bearer workspace-a" suspend={false}>
          workspace-a
        </Probe>
      </Suspense>,
    );

    act(() => {
      startTransition(() => {
        view.rerender(
          <Suspense fallback={null}>
            <Probe authorization="Bearer workspace-b" suspend>
              workspace-b
            </Probe>
          </Suspense>,
        );
      });
    });

    expect(view.container.textContent).toBe("workspace-a");
    await committedHost?.callTool({ name: "search" });

    expect(fetch).toHaveBeenCalledWith("/api/mcp-apps", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer workspace-a",
      },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "search" },
      }),
    });
  });
});
