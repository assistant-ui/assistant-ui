// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { resource, useResource, withKey } from "@assistant-ui/tap";
import { memo } from "react";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  McpAppBridgeHandlers,
  McpAppsHost,
  McpAppsRemoteHostOptions,
} from "./types";

const { framePropsMock } = vi.hoisted(() => ({ framePropsMock: vi.fn() }));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({
    thread: () => ({ append: vi.fn() }),
  }),
}));

vi.mock("./app-frame", () => ({
  McpAppFrame: (props: unknown) => {
    framePropsMock(props);
    return null;
  },
}));

import { McpAppRenderer } from "./McpAppRenderer";
import { McpAppsRemoteHost } from "./McpAppsRemoteHost";

const useHost = ({ host }: { host: McpAppsHost }) => host;
const Host = resource(useHost);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const createPart = (serverId?: string): ToolCallMessagePartProps => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "search",
  args: {},
  argsText: "{}",
  status: { type: "complete" },
  mcp: {
    app: {
      resourceUri: "ui://example/search",
      ...(serverId !== undefined ? { serverId } : {}),
    },
  },
  addResult: vi.fn(),
  resume: vi.fn(),
  respondToApproval: vi.fn(),
});

function Harness({ host, serverId }: { host: McpAppsHost; serverId?: string }) {
  const renderer = useResource(
    McpAppRenderer({
      host: Host({ host }),
    }),
  );
  const Renderer = renderer.render;
  return <Renderer {...createPart(serverId)} />;
}

const MemoizedPart = memo(function MemoizedPart({
  Renderer,
}: {
  Renderer: ToolCallMessagePartComponent;
}) {
  return <Renderer {...createPart()} />;
});

function MemoizedHarness({ host }: { host: McpAppsHost }) {
  const renderer = useResource(
    McpAppRenderer({
      host: Host({ host }),
    }),
  );
  return <MemoizedPart Renderer={renderer.render} />;
}

function RemoteHarness({
  url,
  headers,
  fetch,
  resourceKey,
}: {
  url: string;
  headers: NonNullable<McpAppsRemoteHostOptions["headers"]>;
  fetch: typeof globalThis.fetch;
  resourceKey?: string | number;
}) {
  const host = McpAppsRemoteHost({ url, headers, fetch });
  const renderer = useResource(
    McpAppRenderer({
      host: resourceKey === undefined ? host : withKey(resourceKey, host),
    }),
  );
  return <MemoizedPart Renderer={renderer.render} />;
}

describe("McpAppRenderer", () => {
  beforeEach(() => {
    framePropsMock.mockReset();
  });

  it("injects serverId into loadResource and reloads when it changes", async () => {
    const loadResource = vi.fn(async ({ uri }: { uri: string }) => ({
      uri,
      mimeType: "text/html;profile=mcp-app" as const,
      html: "",
    }));
    const host: McpAppsHost = {
      loadResource,
      callTool: vi.fn(),
      readResource: vi.fn(),
      listResources: vi.fn(),
    };

    const view = render(<Harness host={host} serverId="server-a" />);
    await waitFor(() =>
      expect(loadResource).toHaveBeenCalledWith({
        uri: "ui://example/search",
        serverId: "server-a",
      }),
    );

    view.rerender(<Harness host={host} serverId="server-b" />);
    await waitFor(() => expect(loadResource).toHaveBeenCalledTimes(2));
    expect(loadResource).toHaveBeenLastCalledWith({
      uri: "ui://example/search",
      serverId: "server-b",
    });
  });

  it("reloads the resource and hides stale HTML when the host changes", async () => {
    const nextResource = createDeferred<{
      uri: string;
      mimeType: "text/html;profile=mcp-app";
      html: string;
    }>();
    const firstHost: McpAppsHost = {
      loadResource: vi.fn(async ({ uri }) => ({
        uri,
        mimeType: "text/html;profile=mcp-app" as const,
        html: "first host",
      })),
      callTool: vi.fn(),
      readResource: vi.fn(),
      listResources: vi.fn(),
    };
    const nextHost: McpAppsHost = {
      loadResource: vi.fn(() => nextResource.promise),
      callTool: vi.fn(),
      readResource: vi.fn(),
      listResources: vi.fn(),
    };

    const view = render(<MemoizedHarness host={firstHost} />);
    await waitFor(() =>
      expect(framePropsMock.mock.lastCall?.[0].resource.html).toBe(
        "first host",
      ),
    );

    framePropsMock.mockClear();
    view.rerender(<MemoizedHarness host={nextHost} />);

    expect(nextHost.loadResource).toHaveBeenCalledTimes(1);
    expect(framePropsMock).not.toHaveBeenCalled();

    nextResource.resolve({
      uri: "ui://example/search",
      mimeType: "text/html;profile=mcp-app",
      html: "next host",
    });
    await waitFor(() =>
      expect(framePropsMock.mock.lastCall?.[0].resource.html).toBe("next host"),
    );
  });

  it("reloads remote resources when the URL changes and keeps headers current", async () => {
    const fetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) =>
        Response.json({
          uri: "ui://example/search",
          mimeType: "text/html;profile=mcp-app",
          html: `${String(url)}:${new Headers(init?.headers).get("authorization")}`,
        }),
    ) as unknown as typeof globalThis.fetch;

    const view = render(
      <RemoteHarness
        url="/host-a"
        headers={{ authorization: "Bearer a" }}
        fetch={fetch}
      />,
    );
    await waitFor(() =>
      expect(framePropsMock.mock.lastCall?.[0].resource.html).toBe(
        "/host-a:Bearer a",
      ),
    );

    view.rerender(
      <RemoteHarness
        url="/host-b"
        headers={{ authorization: "Bearer a" }}
        fetch={fetch}
      />,
    );
    await waitFor(() =>
      expect(framePropsMock.mock.lastCall?.[0].resource.html).toBe(
        "/host-b:Bearer a",
      ),
    );

    view.rerender(
      <RemoteHarness
        url="/host-b"
        headers={{ authorization: "Bearer b" }}
        fetch={fetch}
      />,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    await framePropsMock.mock.lastCall?.[0].handlers.callTool({
      name: "search",
    });
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "/host-b",
      expect.objectContaining({
        headers: {
          "content-type": "application/json",
          authorization: "Bearer b",
        },
      }),
    );

    view.rerender(
      <RemoteHarness
        url="/host-b"
        headers={{ authorization: "Bearer b" }}
        fetch={fetch}
      />,
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("keeps mutated static headers current without reloading the resource", async () => {
    const fetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) =>
        Response.json({
          uri: "ui://example/search",
          mimeType: "text/html;profile=mcp-app",
          html: `${String(url)}:${new Headers(init?.headers).get("authorization")}`,
        }),
    ) as unknown as typeof globalThis.fetch;
    const headers = { authorization: "Bearer a" };

    const view = render(
      <RemoteHarness url="/host" headers={headers} fetch={fetch} />,
    );
    await waitFor(() =>
      expect(framePropsMock.mock.lastCall?.[0].resource.html).toBe(
        "/host:Bearer a",
      ),
    );

    headers.authorization = "Bearer b";
    view.rerender(
      <RemoteHarness url="/host" headers={headers} fetch={fetch} />,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    await framePropsMock.mock.lastCall?.[0].handlers.callTool({
      name: "search",
    });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/host",
      expect.objectContaining({
        headers: {
          "content-type": "application/json",
          authorization: "Bearer b",
        },
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses resource keys to reload dynamic headers without callback identity churn", async () => {
    const fetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) =>
        Response.json({
          uri: "ui://example/search",
          mimeType: "text/html;profile=mcp-app",
          html: `${String(url)}:${new Headers(init?.headers).get("authorization")}`,
        }),
    ) as unknown as typeof globalThis.fetch;

    const view = render(
      <RemoteHarness
        url="/host"
        headers={() => ({ authorization: "Bearer a" })}
        resourceKey="workspace-a"
        fetch={fetch}
      />,
    );
    await waitFor(() =>
      expect(framePropsMock.mock.lastCall?.[0].resource.html).toBe(
        "/host:Bearer a",
      ),
    );

    view.rerender(
      <RemoteHarness
        url="/host"
        headers={() => ({ authorization: "Bearer a" })}
        resourceKey="workspace-a"
        fetch={fetch}
      />,
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    view.rerender(
      <RemoteHarness
        url="/host"
        headers={() => ({ authorization: "Bearer b" })}
        resourceKey="workspace-b"
        fetch={fetch}
      />,
    );
    await waitFor(() =>
      expect(framePropsMock.mock.lastCall?.[0].resource.html).toBe(
        "/host:Bearer b",
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives the renderer serverId precedence in listResources", async () => {
    const listResources = vi.fn();
    const host: McpAppsHost = {
      loadResource: vi.fn(async ({ uri }) => ({
        uri,
        mimeType: "text/html;profile=mcp-app" as const,
        html: "",
      })),
      callTool: vi.fn(),
      readResource: vi.fn(),
      listResources,
    };

    render(<Harness host={host} serverId="host-server" />);
    await waitFor(() => expect(framePropsMock).toHaveBeenCalled());
    const handlers = framePropsMock.mock.lastCall?.[0]
      .handlers as McpAppBridgeHandlers;

    await handlers.listResources?.({
      cursor: "next",
      serverId: "widget-server",
    });
    expect(listResources).toHaveBeenCalledWith({
      cursor: "next",
      serverId: "host-server",
    });
  });

  it("passes listResources params through unchanged without serverId", async () => {
    const listResources = vi.fn();
    const host: McpAppsHost = {
      loadResource: vi.fn(async ({ uri }) => ({
        uri,
        mimeType: "text/html;profile=mcp-app" as const,
        html: "",
      })),
      callTool: vi.fn(),
      readResource: vi.fn(),
      listResources,
    };
    const params = { cursor: "next" };

    render(<Harness host={host} />);
    await waitFor(() => expect(framePropsMock).toHaveBeenCalled());
    const handlers = framePropsMock.mock.lastCall?.[0]
      .handlers as McpAppBridgeHandlers;

    await handlers.listResources?.(params);
    expect(listResources).toHaveBeenCalledWith(params);
  });
});
