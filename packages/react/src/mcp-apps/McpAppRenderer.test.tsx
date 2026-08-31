// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { resource, useResource, withKey } from "@assistant-ui/tap";
import { act, memo, startTransition, Suspense } from "react";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  McpAppBridgeHandlers,
  McpAppFrameProps,
  McpAppHostContext,
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

import { McpAppRenderer, type McpAppRendererOptions } from "./McpAppRenderer";
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

const createPart = (
  serverId?: string,
  toolCallId = "call-1",
): ToolCallMessagePartProps => ({
  type: "tool-call",
  toolCallId,
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

const createPartWithoutApp = (): ToolCallMessagePartProps => {
  const part = createPart();
  delete part.mcp;
  return part;
};

function Harness({
  host,
  serverId,
  handlers,
  part,
}: {
  host: McpAppsHost;
  serverId?: string;
  handlers?: McpAppRendererOptions["handlers"];
  part?: ToolCallMessagePartProps;
}) {
  const renderer = useResource(
    McpAppRenderer({
      host: Host({ host }),
      ...(handlers === undefined ? {} : { handlers }),
    }),
  );
  const Renderer = renderer.render;
  return <Renderer {...(part ?? createPart(serverId))} />;
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

const MemoizedPartById = memo(function MemoizedPartById({
  Renderer,
  toolCallId,
}: {
  Renderer: ToolCallMessagePartComponent;
  toolCallId: string;
}) {
  return <Renderer {...createPart(undefined, toolCallId)} />;
});

function OptionsHarness({
  host,
  hostContext,
  handlers,
  forPart,
  toolCallIds = ["call-1"],
}: {
  host: McpAppsHost;
  hostContext?: McpAppHostContext;
  handlers?: McpAppRendererOptions["handlers"];
  forPart?: McpAppRendererOptions["forPart"];
  toolCallIds?: string[];
}) {
  const renderer = useResource(
    McpAppRenderer({
      host: Host({ host }),
      ...(hostContext === undefined ? {} : { hostContext }),
      ...(handlers === undefined ? {} : { handlers }),
      ...(forPart === undefined ? {} : { forPart }),
    }),
  );
  return toolCallIds.map((toolCallId) => (
    <MemoizedPartById
      key={toolCallId}
      Renderer={renderer.render}
      toolCallId={toolCallId}
    />
  ));
}

const framePropsCalls = () =>
  framePropsMock.mock.calls.map(([props]) => props as McpAppFrameProps);

const loadingHost = (): McpAppsHost => ({
  loadResource: vi.fn(async ({ uri }) => ({
    uri,
    mimeType: "text/html;profile=mcp-app" as const,
    html: "",
  })),
  callTool: vi.fn(),
  readResource: vi.fn(),
  listResources: vi.fn(),
});

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

  it("loads newly mounted parts through the committed host", async () => {
    const hostA = loadingHost();
    const hostB = loadingHost();
    const view = render(
      <OptionsHarness host={hostA} toolCallIds={["call-1"]} />,
    );
    await waitFor(() => expect(hostA.loadResource).toHaveBeenCalledOnce());
    vi.mocked(hostA.loadResource).mockClear();

    view.rerender(
      <OptionsHarness host={hostB} toolCallIds={["call-1", "call-2"]} />,
    );
    await waitFor(() => expect(hostB.loadResource).toHaveBeenCalled());

    expect(hostA.loadResource).not.toHaveBeenCalled();
  });

  it("merges forPart handlers over the thread-wide handlers", async () => {
    const onInitialized = vi.fn();
    render(
      <OptionsHarness
        host={loadingHost()}
        handlers={{ onInitialized }}
        forPart={(part) => ({
          handlers: {
            requestDisplayMode: ({ mode }) => {
              void part;
              return { mode };
            },
          },
        })}
      />,
    );

    await waitFor(() => expect(framePropsCalls().length).toBeGreaterThan(0));
    const handlers = framePropsCalls().at(-1)?.handlers;
    expect(handlers?.requestDisplayMode).toBeDefined();
    handlers?.onInitialized?.();
    expect(onInitialized).toHaveBeenCalledOnce();
  });

  it("leaves mounted parts alone when renderer options are unchanged", async () => {
    const host = loadingHost();
    const hostContext: McpAppHostContext = { displayMode: "inline" };
    const view = () => <OptionsHarness host={host} hostContext={hostContext} />;

    const rendered = render(view());
    await waitFor(() => expect(framePropsCalls().length).toBeGreaterThan(0));
    const rendersBefore = framePropsCalls().length;

    rendered.rerender(view());
    expect(framePropsCalls().length).toBe(rendersBefore);
  });

  it("delivers a changed renderer host context to mounted parts", async () => {
    const host = loadingHost();
    const view = render(
      <OptionsHarness host={host} hostContext={{ displayMode: "inline" }} />,
    );
    await waitFor(() =>
      expect(framePropsCalls().at(-1)?.hostContext).toEqual({
        displayMode: "inline",
      }),
    );

    view.rerender(
      <OptionsHarness
        host={host}
        hostContext={{ displayMode: "fullscreen" }}
      />,
    );
    await waitFor(() =>
      expect(framePropsCalls().at(-1)?.hostContext).toEqual({
        displayMode: "fullscreen",
      }),
    );
  });

  it("resolves host context per part through forPart", async () => {
    const modes: Record<string, string> = {
      "call-1": "inline",
      "call-2": "fullscreen",
    };
    render(
      <OptionsHarness
        host={loadingHost()}
        hostContext={{ theme: "light" }}
        toolCallIds={["call-1", "call-2"]}
        forPart={(part) => ({
          hostContext: {
            theme: "light",
            displayMode: modes[part.toolCallId] as "inline" | "fullscreen",
          },
        })}
      />,
    );

    await waitFor(() => expect(framePropsCalls().length).toBeGreaterThan(1));
    const delivered = framePropsCalls().map((props) => props.hostContext);
    expect(delivered).toContainEqual({
      theme: "light",
      displayMode: "inline",
    });
    expect(delivered).toContainEqual({
      theme: "light",
      displayMode: "fullscreen",
    });
  });

  it("gives forPart handlers the part that owns the frame", async () => {
    const promoted: string[] = [];
    render(
      <OptionsHarness
        host={loadingHost()}
        toolCallIds={["call-1", "call-2"]}
        forPart={(part) => ({
          hostContext: { toolCallId: part.toolCallId },
          handlers: {
            requestDisplayMode: ({ mode }) => {
              promoted.push(`${part.toolCallId}:${mode}`);
              return { mode };
            },
          },
        })}
      />,
    );

    await waitFor(() => expect(framePropsCalls().length).toBeGreaterThan(1));
    const second = framePropsCalls().find(
      (props) => props.hostContext?.["toolCallId"] === "call-2",
    );
    await second?.handlers?.requestDisplayMode?.({ mode: "fullscreen" });

    expect(promoted).toEqual(["call-2:fullscreen"]);
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

  it("keeps bridge server ids scoped to committed renders", async () => {
    const host: McpAppsHost = {
      loadResource: vi.fn(async ({ uri }) => ({
        uri,
        mimeType: "text/html;profile=mcp-app" as const,
        html: "",
      })),
      callTool: vi.fn(),
      readResource: vi.fn(),
      listResources: vi.fn(),
    };
    const interruptedRender = vi.fn();
    const pending = new Promise<never>(() => {});
    const Blocker = ({ blocked }: { blocked: boolean }) => {
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      return null;
    };
    const view = (part: ToolCallMessagePartProps, blocked: boolean) => (
      <Suspense fallback={null}>
        <Harness host={host} part={part} />
        <Blocker blocked={blocked} />
      </Suspense>
    );
    const rendered = render(view(createPart("server-a"), false));
    await waitFor(() => expect(framePropsMock).toHaveBeenCalled());
    const handlers = framePropsMock.mock.lastCall?.[0]
      .handlers as McpAppBridgeHandlers;

    act(() => {
      startTransition(() =>
        rendered.rerender(view(createPart("server-b"), true)),
      );
    });
    expect(interruptedRender).toHaveBeenCalled();
    await handlers.callTool?.({ name: "search" });

    expect(host.callTool).toHaveBeenCalledWith({
      name: "search",
      serverId: "server-a",
    });

    framePropsMock.mockClear();
    vi.mocked(host.callTool).mockClear();
    rendered.rerender(view(createPartWithoutApp(), false));
    await waitFor(() => expect(framePropsMock).toHaveBeenCalled());
    expect(framePropsMock.mock.lastCall?.[0].app.serverId).toBe("server-a");
    const fallbackHandlers = framePropsMock.mock.lastCall?.[0]
      .handlers as McpAppBridgeHandlers;
    await fallbackHandlers.callTool?.({ name: "search" });
    expect(host.callTool).toHaveBeenCalledWith({
      name: "search",
      serverId: "server-a",
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

    await waitFor(() => expect(nextHost.loadResource).toHaveBeenCalledTimes(1));
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

  it("uses caller UI handlers and keeps data-plane handlers on the host", async () => {
    const host: McpAppsHost = {
      loadResource: vi.fn(async ({ uri }) => ({
        uri,
        mimeType: "text/html;profile=mcp-app" as const,
        html: "",
      })),
      callTool: vi.fn(),
      readResource: vi.fn(),
      listResources: vi.fn(),
    };
    const requestDisplayMode = vi.fn(({ mode }) => ({ mode }));
    const updateModelContext = vi.fn();
    const openLink = vi.fn();
    const sendMessage = vi.fn();
    const onInitialized = vi.fn();

    render(
      <Harness
        host={host}
        handlers={{
          requestDisplayMode,
          updateModelContext,
          openLink,
          sendMessage,
          onInitialized,
        }}
      />,
    );
    await waitFor(() => expect(framePropsMock).toHaveBeenCalled());
    const handlers = framePropsMock.mock.lastCall?.[0]
      .handlers as McpAppBridgeHandlers;

    expect(await handlers.requestDisplayMode?.({ mode: "fullscreen" })).toEqual(
      { mode: "fullscreen" },
    );
    await handlers.updateModelContext?.({ text: "context" });
    await handlers.openLink?.({ url: "https://example.com" });
    await handlers.sendMessage?.({ text: "hello" });
    handlers.onInitialized?.();
    await handlers.callTool?.({ name: "search" });
    await handlers.readResource?.({ uri: "ui://resource" });
    await handlers.listResources?.();

    expect(requestDisplayMode).toHaveBeenCalledWith({ mode: "fullscreen" });
    expect(updateModelContext).toHaveBeenCalledWith({ text: "context" });
    expect(openLink).toHaveBeenCalledWith({ url: "https://example.com" });
    expect(sendMessage).toHaveBeenCalledWith({ text: "hello" });
    expect(onInitialized).toHaveBeenCalledOnce();
    expect(host.callTool).toHaveBeenCalledWith({ name: "search" });
    expect(host.readResource).toHaveBeenCalledWith({ uri: "ui://resource" });
    expect(host.listResources).toHaveBeenCalledWith(undefined);
  });
});
