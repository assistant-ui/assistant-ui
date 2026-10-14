import { describe, expect, it, vi } from "vitest";
import { INIT_MESSAGE, METHODS } from "../protocol";
import { createRpcPeer } from "../rpc";
import { startRuntime } from "./index";

describe("startRuntime", () => {
  it("restores state before a widget script runs", async () => {
    const { JSDOM } = await vi.importActual<{
      JSDOM: new (
        html: string,
        options: {
          url: string;
          runScripts: string;
          pretendToBeVisual: boolean;
        },
      ) => { window: Window & typeof globalThis };
    }>("jsdom");
    const dom = new JSDOM(
      '<div id="gf-root"></div><script id="gf-config" type="application/json">{"hostOrigin":"https://host.test","animate":false}</script>',
      {
        url: "https://host.test",
        runScripts: "dangerously",
        pretendToBeVisual: true,
      },
    );
    const win = dom.window;
    const channel = new MessageChannel();
    const peer = createRpcPeer(channel.port1);
    try {
      startRuntime(win);
      win.dispatchEvent(
        new win.MessageEvent("message", {
          source: win.parent,
          origin: "https://host.test",
          data: { type: INIT_MESSAGE, context: {}, state: { count: 4 } },
          ports: [channel.port2],
        }),
      );
      await peer.request(METHODS.replace, {
        code: "<script>document.body.dataset.restored = String(genframe.state.count)</script>",
      });
      expect(win.document.body.dataset.restored).toBe("4");
    } finally {
      peer.dispose();
      channel.port1.close();
      channel.port2.close();
      win.close();
    }
  });

  it("sends genframe.copyText and navigator.clipboard.writeText to the host", async () => {
    const { JSDOM } = await vi.importActual<{
      JSDOM: new (
        html: string,
        options: {
          url: string;
          runScripts: string;
          pretendToBeVisual: boolean;
        },
      ) => { window: Window & typeof globalThis };
    }>("jsdom");
    const dom = new JSDOM(
      '<div id="gf-root"></div><script id="gf-config" type="application/json">{"hostOrigin":"https://host.test","animate":false}</script>',
      {
        url: "https://host.test",
        runScripts: "dangerously",
        pretendToBeVisual: true,
      },
    );
    const win = dom.window;
    const channel = new MessageChannel();
    const copied: unknown[] = [];
    const peer = createRpcPeer(channel.port1, {
      onRequest: (method, params) => {
        if (method === METHODS.copyText) copied.push(params);
        return {};
      },
    });
    try {
      startRuntime(win);
      win.dispatchEvent(
        new win.MessageEvent("message", {
          source: win.parent,
          origin: "https://host.test",
          data: { type: INIT_MESSAGE, context: {}, state: null },
          ports: [channel.port2],
        }),
      );
      await peer.request(METHODS.replace, {
        code: "<script>genframe.copyText('a'); navigator.clipboard.writeText('b')</script>",
      });
      await vi.waitFor(() =>
        expect(copied).toEqual([{ text: "a" }, { text: "b" }]),
      );
    } finally {
      peer.dispose();
      channel.port1.close();
      channel.port2.close();
      win.close();
    }
  });
});
