// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { serveWebviewHost } from "../host/serve";
import type { BridgeMessage } from "../protocol";
import { createInMemoryBridge } from "../testUtils";
import { installLinkInterceptor, type LinkInterceptorOptions } from "./links";

const disposers: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposers.splice(0).reverse()) dispose();
  document.body.innerHTML = "";
});

const setup = (options: Omit<LinkInterceptorOptions, "port"> = {}) => {
  const bridge = createInMemoryBridge();
  const openExternal = vi.fn((_url: string) => Promise.resolve(true));
  const host = serveWebviewHost(bridge.webview, { openExternal });
  const uninstall = installLinkInterceptor({ ...options, port: bridge.port });
  disposers.push(() => host.dispose(), uninstall);
  return { bridge, openExternal, uninstall };
};

const render = (html: string) => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
};

const click = (
  target: Element,
  { type = "click", ...init }: MouseEventInit & { type?: string } = {},
) => {
  let prevented = false;
  const record = (event: Event) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  window.addEventListener(type, record, { once: true });
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, ...init }),
  );
  return prevented;
};

const rpcRequests = (messages: unknown[]) =>
  (messages as BridgeMessage[]).filter((m) => m.kind === "rpc:request");

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("installLinkInterceptor", () => {
  it("opens a target=_blank link through the host", async () => {
    const { openExternal } = setup();
    const link = render(
      '<a href="https://example.com/docs?q=1" target="_blank">docs</a>',
    );

    expect(click(link)).toBe(true);
    await vi.waitFor(() =>
      expect(openExternal).toHaveBeenCalledWith("https://example.com/docs?q=1"),
    );
  });

  it("opens a link clicked through a nested element", async () => {
    const { openExternal } = setup();
    render(
      '<a href="http://example.com/"><span><b id="inner">x</b></span></a>',
    );

    expect(click(document.getElementById("inner")!)).toBe(true);
    await vi.waitFor(() =>
      expect(openExternal).toHaveBeenCalledWith("http://example.com/"),
    );
  });

  it("opens mailto links", async () => {
    const { openExternal } = setup();

    click(render('<a href="mailto:team@example.com">mail</a>'));

    await vi.waitFor(() =>
      expect(openExternal).toHaveBeenCalledWith("mailto:team@example.com"),
    );
  });

  it("opens a middle-clicked link but ignores other buttons", async () => {
    const { openExternal } = setup();
    const link = render('<a href="https://example.com/">x</a>');

    expect(click(link, { type: "auxclick", button: 2 })).toBe(false);
    expect(click(link, { type: "auxclick", button: 1 })).toBe(true);
    await vi.waitFor(() => expect(openExternal).toHaveBeenCalledOnce());
  });

  it.each([
    ["a relative path", "/docs/page"],
    ["a same-document anchor", "#section"],
    ["a javascript: URL", "javascript:void(0)"],
    ["a scheme outside the allow-list", "vscode://file/x"],
  ])("leaves %s alone", async (_, href) => {
    const { bridge, openExternal } = setup();
    const link = document.createElement("a");
    link.setAttribute("href", href);
    document.body.append(link);

    expect(click(link)).toBe(false);
    await settle();

    expect(rpcRequests(bridge.webviewToHost)).toHaveLength(0);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("leaves a click the app already prevented alone", async () => {
    const { bridge } = setup();
    const link = render('<a href="https://example.com/">x</a>');
    link.addEventListener("click", (event) => event.preventDefault());

    click(link);
    await settle();

    expect(rpcRequests(bridge.webviewToHost)).toHaveLength(0);
  });

  it("uses the configured schemes", async () => {
    const { openExternal } = setup({ schemes: ["https:"] });

    expect(click(render('<a href="http://example.com/">x</a>'))).toBe(false);
    expect(click(render('<a href="https://example.com/">x</a>'))).toBe(true);
    await vi.waitFor(() =>
      expect(openExternal).toHaveBeenCalledWith("https://example.com/"),
    );
    expect(openExternal).toHaveBeenCalledOnce();
  });

  it("routes window.open to the host and restores it on uninstall", async () => {
    const original = vi.fn(() => null);
    window.open = original;
    const { openExternal, uninstall } = setup();

    expect(window.open("https://example.com/a", "_blank")).toBeNull();
    window.open("/relative", "_self");

    await vi.waitFor(() =>
      expect(openExternal).toHaveBeenCalledWith("https://example.com/a"),
    );
    expect(original).toHaveBeenCalledOnce();
    expect(original).toHaveBeenCalledWith("/relative", "_self");

    uninstall();

    expect(window.open).toBe(original);
    expect(click(render('<a href="https://example.com/">x</a>'))).toBe(false);
  });

  it("leaves window.open unintercepted after interceptors are removed out of order", async () => {
    const original = vi.fn(() => null);
    window.open = original;
    const first = setup();
    const second = setup();

    first.uninstall();
    second.uninstall();
    window.open("https://example.com/a", "_blank");
    await settle();

    expect(original).toHaveBeenCalledWith("https://example.com/a", "_blank");
    expect(first.openExternal).not.toHaveBeenCalled();
    expect(second.openExternal).not.toHaveBeenCalled();
  });

  it("reports a URL the host refuses", async () => {
    const bridge = createInMemoryBridge();
    const openExternal = vi.fn();
    const onError = vi.fn();
    const host = serveWebviewHost(bridge.webview, { openExternal });
    const uninstall = installLinkInterceptor({
      schemes: ["command:"],
      onError,
      port: bridge.port,
    });
    disposers.push(() => host.dispose(), uninstall);

    click(render('<a href="command:workbench.action.quit">x</a>'));

    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
    expect(openExternal).not.toHaveBeenCalled();
  });
});
