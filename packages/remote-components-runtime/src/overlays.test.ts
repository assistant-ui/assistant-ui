// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { FunctionTargets } from "@assistant-ui/remote-components-protocol";
import { OverlayManager } from "./overlays.js";

function fakeChannel() {
  const requests: { method: string; params: unknown }[] = [];
  const events: { type: string; params: unknown }[] = [];
  const channel = {
    on: () => () => {},
    notify: (type: string, params: unknown) =>
      void events.push({ type, params }),
    request: (method: string, params: unknown) => {
      requests.push({ method, params });
      return Promise.resolve(null);
    },
  };
  return { channel: channel as never, requests, events };
}

describe("OverlayManager", () => {
  it("does not resend props that encode the same", () => {
    const { channel, requests } = fakeChannel();
    const manager = new OverlayManager(
      channel,
      new FunctionTargets(),
      window,
      "https://remote.example/x/",
    );
    const handle = manager.openOverlay({
      kind: "dialog",
      src: "../confirm/",
      props: { message: "a", onOk: () => {} },
    });
    handle.update({ message: "a", onOk: () => {} }); // new literal, same data
    handle.update({ message: "b", onOk: () => {} });
    expect(requests.map((r) => r.method)).toEqual([
      "rc/overlay/open",
      "rc/overlay/update",
    ]);
    manager.dispose();
  });

  it("lets the host call only functions it was sent", async () => {
    const { channel } = fakeChannel();
    const targets = new FunctionTargets();
    const manager = new OverlayManager(
      channel,
      targets,
      window,
      "https://remote.example/x/",
    );
    const secret = vi.fn();
    const props = { onOk: vi.fn(() => "ok") };
    Object.defineProperty(props, "secret", {
      value: secret,
      enumerable: false,
    });
    const handle = manager.openOverlay({
      kind: "dialog",
      src: "../confirm/",
      props,
    });
    const scope = `overlay:${handle.id}`;
    await expect(
      targets.invoke({ scope, path: ["onOk"] }, { v: [] }),
    ).resolves.toEqual({ v: "ok" });
    await expect(
      targets.invoke({ scope, path: ["secret"] }, { v: [] }),
    ).rejects.toMatchObject({ code: "stale-function" });
    expect(secret).not.toHaveBeenCalled();
    manager.dispose();
  });

  it("sends options changed while open, and only what changed", () => {
    const { channel, requests } = fakeChannel();
    const manager = new OverlayManager(
      channel,
      new FunctionTargets(),
      window,
      "https://remote.example/x/",
    );
    const anchor = document.createElement("button");
    document.body.append(anchor);
    const handle = manager.openOverlay({
      kind: "popover",
      src: "../menu/",
      anchor,
      placement: { side: "bottom", align: "start" },
      offset: 4,
      label: "Menu",
    });
    handle.setOptions({
      placement: { side: "bottom", align: "start" },
      offset: 4,
      label: "Menu",
    }); // same values
    handle.setOptions({
      placement: { side: "top", align: "end" },
      offset: 4,
      label: "Actions",
    });
    handle.setOptions({ offset: 8, matchAnchorWidth: true });
    const updates = requests
      .filter((r) => r.method === "rc/overlay/update")
      .map((r) => r.params);
    expect(updates).toEqual([
      {
        id: handle.id,
        placement: { side: "top", align: "end" },
        label: "Actions",
      },
      { id: handle.id, offset: 8, matchAnchorWidth: true },
    ]);
    handle.close();
    handle.setOptions({ offset: 12 });
    expect(
      requests.filter((r) => r.method === "rc/overlay/update"),
    ).toHaveLength(2);
    manager.dispose();
    anchor.remove();
  });

  it("tracks a new anchor element", () => {
    const { channel, events } = fakeChannel();
    const manager = new OverlayManager(
      channel,
      new FunctionTargets(),
      window,
      "https://remote.example/x/",
    );
    const a = document.createElement("button");
    const b = document.createElement("button");
    document.body.append(a, b);
    a.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 10, height: 10 }) as DOMRect;
    b.getBoundingClientRect = () =>
      ({ x: 50, y: 20, width: 30, height: 10 }) as DOMRect;
    const handle = manager.openOverlay({
      kind: "popover",
      src: "../menu/",
      anchor: a,
    });
    handle.setOptions({ anchor: b });
    expect(
      events
        .filter((e) => e.type === "rc/notifications/overlay-anchor-changed")
        .at(-1)?.params,
    ).toEqual({
      id: handle.id,
      anchor: { x: 50, y: 20, width: 30, height: 10 },
    });
    manager.dispose();
    a.remove();
    b.remove();
  });
});
