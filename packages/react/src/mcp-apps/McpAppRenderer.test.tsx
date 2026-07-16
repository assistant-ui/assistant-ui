// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { resource, useResource } from "@assistant-ui/tap";
import type { ToolCallMessagePartProps } from "@assistant-ui/core/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { McpAppBridgeHandlers, McpAppsHost } from "./types";

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

const useHost = ({ host }: { host: McpAppsHost }) => host;
const Host = resource(useHost);

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
