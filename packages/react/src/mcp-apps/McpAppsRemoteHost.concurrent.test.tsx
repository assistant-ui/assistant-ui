// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
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

    view.unmount();
  });

  it("keeps the URL and authorization from one committed options snapshot", async () => {
    const fetch = vi.fn(async () => Response.json({ content: [] }));
    let currentHost: McpAppsHost | undefined;

    const Probe = ({
      url,
      authorization,
    }: {
      url: string;
      authorization: string;
    }) => {
      const host = useResource(
        McpAppsRemoteHost({
          url,
          fetch,
          headers: { authorization },
        }),
      );
      useLayoutEffect(() => {
        currentHost = host;
        void host.callTool({ name: "layout-request" });
      }, [host]);
      return null;
    };

    const view = render(
      <Probe url="/workspace-a/mcp" authorization="Bearer workspace-a" />,
    );
    fetch.mockClear();

    view.rerender(
      <Probe url="/workspace-b/mcp" authorization="Bearer workspace-b" />,
    );

    expect(fetch).toHaveBeenNthCalledWith(1, "/workspace-b/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer workspace-b",
      },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "layout-request" },
      }),
    });

    await currentHost?.callTool({ name: "committed-request" });

    expect(fetch).toHaveBeenNthCalledWith(2, "/workspace-b/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer workspace-b",
      },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "committed-request" },
      }),
    });

    view.unmount();
  });

  it("refreshes pending options when a URL switch render retries", async () => {
    let authorization = "Bearer workspace-b-old";
    let resumed = false;
    let resume: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      resume = () => {
        resumed = true;
        resolve();
      };
    });
    const fetch = vi.fn(async () => Response.json({ content: [] }));

    const Probe = ({ url }: { url: string }) => {
      const host = useResource(
        McpAppsRemoteHost({
          url,
          fetch,
          headers: {
            authorization:
              url === "/workspace-a/mcp" ? "Bearer workspace-a" : authorization,
          },
        }),
      );
      useLayoutEffect(() => {
        void host.callTool({ name: "layout-request" });
      }, [host]);
      if (url === "/workspace-b/mcp" && !resumed) throw pending;
      return <span>{url}</span>;
    };

    const view = render(
      <Suspense fallback={null}>
        <Probe url="/workspace-a/mcp" />
      </Suspense>,
    );
    try {
      fetch.mockClear();

      act(() => {
        startTransition(() => {
          view.rerender(
            <Suspense fallback={null}>
              <Probe url="/workspace-b/mcp" />
            </Suspense>,
          );
        });
      });
      expect(view.container.textContent).toBe("/workspace-a/mcp");

      authorization = "Bearer workspace-b-new";
      await act(async () => resume?.());
      await waitFor(() =>
        expect(view.container.textContent).toBe("/workspace-b/mcp"),
      );

      expect(fetch).toHaveBeenCalledWith("/workspace-b/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer workspace-b-new",
        },
        body: JSON.stringify({
          method: "tools/call",
          params: { name: "layout-request" },
        }),
      });
    } finally {
      view.unmount();
    }
  });
});
