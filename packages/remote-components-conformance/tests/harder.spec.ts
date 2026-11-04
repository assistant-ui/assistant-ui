import { expect, test, type Page } from "@playwright/test";

const revealed = (page: Page) =>
  page.locator("#remote [data-rc-slot][data-rc-revealed]");
const frame = (page: Page, id = "main") =>
  page.frameLocator(`#remote .subject-${id} iframe`);
const events = (page: Page) => page.evaluate(() => window.__events);

/** Focus as a path: "host:<id>" or "<subject id>><probe>", nested frames as "<subject>>frame>…". */
async function focusPath(page: Page): Promise<string> {
  const top = await page.evaluateHandle(() => document.activeElement);
  const host = await top.evaluate((a) =>
    a === null || a.tagName !== "IFRAME"
      ? `host:${(a as HTMLElement | null)?.id || a?.tagName}`
      : null,
  );
  if (host !== null) return host;
  const parts = [
    await top.evaluate(
      (a) =>
        (a as Element)
          .closest("[data-rc-slot]")
          ?.className.match(/subject-(\S+)/)?.[1] ?? "?",
    ),
  ];
  let handle = top;
  for (let depth = 0; depth < 4; depth++) {
    const f = await handle.asElement()?.contentFrame();
    if (f == null) break;
    const inner = await f.evaluateHandle(() => document.activeElement);
    const desc = await inner.evaluate((a) =>
      a === null || a === document.body
        ? "body"
        : a.tagName === "IFRAME"
          ? null
          : ((a as HTMLElement).dataset.probe ?? a.tagName),
    );
    if (desc !== null) return [...parts, desc].join(">");
    parts.push("frame");
    handle = inner;
  }
  return parts.join(">");
}

test.describe("tab order across remotes", () => {
  test("Tab and Shift+Tab visit host and remote stops in document order, skipping remotes without stops", async ({
    page,
  }) => {
    await page.goto("/?case=tab-order");
    await expect(revealed(page)).toHaveCount(4, { timeout: 15_000 });
    await expect(
      frame(page, "n").frameLocator("iframe").locator("[data-probe=first]"),
    ).toBeVisible();
    const forward = [
      "a>first",
      "a>second",
      "host:b1",
      "c>first",
      "c>second",
      "n>frame>first",
      "n>frame>second",
      "host:b2",
    ];
    await page.locator("#b0").focus();
    for (const want of forward) {
      await page.keyboard.press("Tab");
      await expect.poll(() => focusPath(page)).toBe(want);
    }
    for (const want of [...forward].reverse().slice(1).concat("host:b0")) {
      await page.keyboard.press("Shift+Tab");
      await expect.poll(() => focusPath(page)).toBe(want);
    }
  });
});

test.describe("long-running RPC", () => {
  test("an AbortSignal cancels a pending host call on both sides", async ({
    page,
  }) => {
    await page.goto("/?case=rpc-cancel");
    await expect(revealed(page)).toHaveCount(1);
    const f = frame(page);
    await f.locator("[data-probe=start]").click();
    await expect(f.locator("[data-probe=status]")).toHaveText("pending");
    await f.locator("[data-probe=cancel]").click();
    await expect(f.locator("[data-probe=status]")).toHaveText(
      "error:AbortError",
    );
    await expect
      .poll(async () =>
        (await events(page)).filter((e) => e.type === "search-abort"),
      )
      .toEqual([{ type: "search-abort", id: "needle", code: "cancelled" }]);
  });
});

test.describe("high-frequency props", () => {
  test("bursts coalesce, every update lands, the remote ends on the last value", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __props: number };
      w.__props = 0;
      const post = MessagePort.prototype.postMessage;
      MessagePort.prototype.postMessage = function (
        this: MessagePort,
        m: unknown,
        ...rest: unknown[]
      ) {
        if (
          m !== null &&
          typeof m === "object" &&
          (m as { method?: unknown }).method ===
            "rc/notifications/props-changed"
        )
          w.__props++;
        return (post as (...a: unknown[]) => void).call(this, m, ...rest);
      };
    });
    await page.goto("/?case=high-frequency");
    await expect(revealed(page)).toHaveCount(1);
    const count = frame(page).locator("[data-probe=count]");
    const sent = () =>
      page.evaluate(() => (window as unknown as { __props: number }).__props);

    // 1000 updates in one task: one message.
    let before = await sent();
    await page.evaluate(() => {
      for (let i = 1; i <= 1000; i++) window.__case.set({ count: i });
    });
    await expect(count).toHaveText("1000");
    expect((await sent()) - before).toBe(1);

    // 300 updates, one per task: at most one message each, final value wins.
    before = await sent();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let i = 0;
          const step = (): void => {
            window.__case.set({ count: 2000 + ++i });
            if (i < 300) setTimeout(step, 0);
            else resolve();
          };
          step();
        }),
    );
    await expect(count).toHaveText("2300", { timeout: 2000 });
    expect((await sent()) - before).toBeLessThanOrEqual(300);

    // One update per frame for 60 frames: the remote keeps up (no backlog).
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let i = 0;
          const step = (): void => {
            window.__case.set({ count: 3000 + ++i });
            if (i < 60) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        }),
    );
    await expect(count).toHaveText("3060", { timeout: 500 });
  });
});

test.describe("transitions", () => {
  test("a height transition inside the remote is followed by the slot frame by frame", async ({
    page,
  }) => {
    await page.goto("/?case=transition");
    await expect(revealed(page)).toHaveCount(1);
    const samples = await page.evaluate(
      () =>
        new Promise<[number, number][]>((resolve) => {
          const out: [number, number][] = [];
          const h = (col: string) =>
            document.querySelector(`#${col} .subject`)!.getBoundingClientRect()
              .height;
          window.__case.set({ open: true });
          const t0 = performance.now();
          const tick = (): void => {
            out.push([h("inline"), h("remote")]);
            if (performance.now() - t0 < 700) requestAnimationFrame(tick);
            else resolve(out);
          };
          requestAnimationFrame(tick);
        }),
    );
    const remote = samples.map((s) => s[1]);
    // Animated, not a jump: many intermediate heights, never shrinking.
    expect(
      new Set(remote.filter((h) => h > 40.5 && h < 159.5)).size,
    ).toBeGreaterThan(5);
    for (let i = 1; i < remote.length; i++)
      expect(remote[i]!).toBeGreaterThanOrEqual(remote[i - 1]! - 0.01);
    expect(remote.at(-1)).toBeCloseTo(160, 1);
    // Lags the inline reference by at most a couple of frames (120px / 400ms ≈ 5px per 16ms frame).
    const lag = Math.max(...samples.map(([a, b]) => a - b));
    expect(lag).toBeLessThanOrEqual(20);
  });
});

test.describe("text selection", () => {
  test("text in a remote can be selected and copied", async ({ page }) => {
    await page.goto("/?case=selection");
    await expect(revealed(page)).toHaveCount(1);
    const text = frame(page).locator("[data-probe=text]");
    await text.click({ clickCount: 3 });
    const f = (await (await page
      .locator("#remote iframe")
      .elementHandle())!.contentFrame())!;
    await f.evaluate(() => {
      (window as unknown as { __copied: string }).__copied = "";
      document.addEventListener(
        "copy",
        () =>
          ((window as unknown as { __copied: string }).__copied =
            String(getSelection())),
      );
    });
    expect((await f.evaluate(() => String(getSelection()))).trim()).toBe(
      "Select this sentence and copy it.",
    );
    await page.keyboard.press("ControlOrMeta+c");
    await expect
      .poll(() =>
        f.evaluate(() =>
          (window as unknown as { __copied: string }).__copied.trim(),
        ),
      )
      .toBe("Select this sentence and copy it.");
  });
});

test.describe("teardown", () => {
  test("unmounting leaves no listeners, observers, ports, frames or animation loops behind", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const t = {
        listeners: new Set<string>(),
        ids: new WeakMap<object, number>(),
        next: 0,
        observers: new Set<object>(),
        ports: new Set<MessagePort>(),
        raf: 0,
      };
      (window as unknown as { __track: typeof t }).__track = t;
      const id = (o: object): number => {
        let v = t.ids.get(o);
        if (v === undefined) t.ids.set(o, (v = ++t.next));
        return v;
      };
      const key = (
        target: EventTarget,
        type: string,
        l: unknown,
        o: unknown,
      ): string =>
        `${target === window ? "w" : "d"}:${type}:${typeof l === "object" || typeof l === "function" ? id(l as object) : "?"}:${typeof o === "boolean" ? o : (o as { capture?: boolean } | undefined)?.capture === true}`;
      const add = EventTarget.prototype.addEventListener;
      const remove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (
        this: EventTarget,
        type: string,
        l: EventListenerOrEventListenerObject | null,
        o?: boolean | AddEventListenerOptions,
      ) {
        if (
          (this === window || this === document) &&
          l !== null &&
          !(typeof o === "object" && o.once === true)
        )
          t.listeners.add(key(this, type, l, o));
        return add.call(this, type, l, o);
      };
      EventTarget.prototype.removeEventListener = function (
        this: EventTarget,
        type: string,
        l: EventListenerOrEventListenerObject | null,
        o?: boolean | EventListenerOptions,
      ) {
        if ((this === window || this === document) && l !== null)
          t.listeners.delete(key(this, type, l, o));
        return remove.call(this, type, l, o);
      };
      for (const name of [
        "MutationObserver",
        "ResizeObserver",
        "IntersectionObserver",
      ] as const) {
        const C = window[name] as unknown as {
          prototype: {
            observe: (...a: unknown[]) => void;
            disconnect: () => void;
          };
        };
        const observe = C.prototype.observe;
        const disconnect = C.prototype.disconnect;
        C.prototype.observe = function (this: object, ...a: unknown[]) {
          t.observers.add(this);
          return observe.apply(this, a);
        };
        C.prototype.disconnect = function (this: object) {
          t.observers.delete(this);
          return disconnect.call(this);
        };
      }
      const MC = window.MessageChannel;
      window.MessageChannel = class extends MC {
        constructor() {
          super();
          t.ports.add(this.port1);
        }
      };
      const close = MessagePort.prototype.close;
      MessagePort.prototype.close = function (this: MessagePort) {
        t.ports.delete(this);
        return close.call(this);
      };
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        t.raf++;
        return raf(cb);
      };
    });
    await page.goto("/?case=teardown");
    const snapshot = () =>
      page.evaluate(() => {
        const t = (
          window as unknown as {
            __track: {
              listeners: Set<string>;
              observers: Set<object>;
              ports: Set<MessagePort>;
            };
          }
        ).__track;
        return {
          listeners: [...t.listeners].sort(),
          observers: t.observers.size,
          ports: t.ports.size,
          iframes: document.querySelectorAll("iframe").length,
          overlays: document.querySelectorAll("[data-rc-overlay]").length,
        };
      });
    const cycle = async () => {
      await page.evaluate(() => window.__case.set({ hidden: false }));
      await expect(revealed(page)).toHaveCount(12, { timeout: 15_000 });
      // Use the things that install listeners: an open popover, a host call.
      await frame(page, "t0").locator("[data-probe=trigger]").click();
      await expect(
        page.locator("[data-rc-overlay] [data-rc-revealed]"),
      ).toHaveCount(1);
      await frame(page, "t1").locator("[data-probe=compute]").click();
      await expect(frame(page, "t1").locator("[data-probe=out]")).toContainText(
        '"compute":"5"',
      );
      await page.evaluate(() => window.__case.set({ hidden: true }));
      await expect(page.locator("#empty")).toBeVisible();
      await page.waitForTimeout(700); // let bursts and timers end
      return snapshot();
    };
    const first = await cycle();
    const second = await cycle();
    // React's scheduler keeps one MessageChannel for its whole life; ours must all close.
    expect(second.ports, "open message ports").toBeLessThanOrEqual(1);
    expect(second.ports, "open message ports").toBe(first.ports);
    expect(second.iframes).toBe(0);
    expect(second.overlays).toBe(0);
    // Playwright's injected script keeps one MutationObserver; ours must all disconnect.
    expect(second.observers, "active observers").toBeLessThanOrEqual(1);
    expect(second.observers, "active observers").toBe(first.observers);
    expect(second.listeners, "window/document listeners").toEqual(
      first.listeners,
    );
    // No animation loop keeps running.
    const rafBefore = await page.evaluate(
      () => (window as unknown as { __track: { raf: number } }).__track.raf,
    );
    await page.waitForTimeout(500);
    expect(
      await page.evaluate(
        () => (window as unknown as { __track: { raf: number } }).__track.raf,
      ),
    ).toBe(rafBefore);
  });
});
