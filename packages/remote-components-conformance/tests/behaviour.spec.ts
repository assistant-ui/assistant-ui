import { expect, test, type Page } from "@playwright/test";

const ready = async (page: Page, n = 1): Promise<void> => {
  await expect(
    page.locator("#remote [data-rc-slot][data-rc-revealed]").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.locator(
      "#remote > div > [data-rc-slot][data-rc-revealed], #remote [data-rc-slot][data-rc-revealed]",
    ),
  ).not.toHaveCount(0);
  if (n > 1)
    await expect(
      page.locator("#remote [data-rc-slot][data-rc-revealed]"),
    ).toHaveCount(n, { timeout: 15_000 });
};
const settleRemote = async (page: Page): Promise<void> => {
  await expect(
    page.locator("#remote [data-rc-slot][data-rc-revealed]").first(),
  ).toBeVisible({ timeout: 15_000 });
};
const frame = (page: Page, id = "main") =>
  page.frameLocator(`#remote .subject-${id} iframe`);
const events = (page: Page) => page.evaluate(() => window.__events);

/**
 * Element focused across frames: "host:<id>" or "<frame-url-path>:<data-probe>".
 * Follows `activeElement` through iframes (headless Firefox and WebKit report
 * `document.hasFocus()` as false inside frames, so that cannot be used).
 */
async function focused(page: Page): Promise<string> {
  const host = await page.evaluate(() => {
    let a = document.activeElement;
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    return a?.tagName === "IFRAME" ? null : `host:${a?.id || a?.tagName}`;
  });
  if (host !== null) return host;
  let handle = await page.evaluateHandle(() => {
    let a = document.activeElement;
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    return a;
  });
  for (let depth = 0; depth < 4; depth++) {
    const el = handle.asElement();
    const f = el === null ? null : await el.contentFrame();
    if (f === null) return "unknown";
    const inner = await f
      .evaluateHandle(() => document.activeElement)
      .catch(() => null);
    if (inner === null) return "unknown";
    const desc = await inner.evaluate((a) => {
      if (a === null || a === document.body) return "body";
      if (a.tagName === "IFRAME") return null;
      return (a as HTMLElement).dataset.probe ?? a.tagName;
    });
    const path = f.url().startsWith("blob:")
      ? "scf"
      : new URL(f.url()).pathname;
    if (desc !== null) return `${path}:${desc}`;
    handle = inner;
  }
  return "unknown";
}

test.describe("overlays: popover", () => {
  test("flips above the anchor near the viewport bottom, stays in the viewport, and calls back", async ({
    page,
  }) => {
    await page.goto("/?case=overlay-popover-edge");
    await ready(page);
    const trigger = frame(page).locator("[data-probe=trigger]");
    await trigger.click();
    const pop = page.locator("[data-rc-overlay-kind=popover]");
    await expect(pop).toBeVisible();
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    const pr = (await pop.boundingBox())!;
    const tr = (await page
      .locator("#remote .subject-main iframe")
      .boundingBox())!;
    const vp = page.viewportSize()!;
    expect(pr.y + pr.height).toBeLessThanOrEqual(tr.y + 4); // above the trigger area
    expect(pr.x).toBeGreaterThanOrEqual(8);
    expect(pr.x + pr.width).toBeLessThanOrEqual(vp.width - 8 + 0.5);
    expect(pr.y).toBeGreaterThanOrEqual(8);
    await page
      .frameLocator("[data-rc-overlay-kind=popover] iframe")
      .locator("[data-item=Cherry]")
      .click();
    await expect(frame(page).locator("[data-probe=selected]")).toHaveText(
      "Cherry",
    );
    await expect(pop).toHaveCount(0);
  });

  test("matches the anchor width and tracks the anchor on host scroll", async ({
    page,
  }) => {
    await page.goto("/?case=overlay-popover-scroll");
    await ready(page);
    await frame(page).locator("[data-probe=trigger]").click();
    const pop = page.locator("[data-rc-overlay-kind=popover]");
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    const before = (await pop.boundingBox())!;
    const anchorW = await frame(page)
      .locator("[data-probe=trigger]")
      .evaluate((e) => e.getBoundingClientRect().width);
    expect(before.width).toBeGreaterThanOrEqual(anchorW - 0.5);
    await page.mouse.wheel(0, 60);
    await expect
      .poll(async () => (await pop.boundingBox())!.y)
      .toBeCloseTo(before.y - 60, 0);
  });

  test("dismisses on outside pointer-down and on Escape; anchor click toggles instead of reopening", async ({
    page,
  }) => {
    await page.goto("/?case=overlay-popover-scroll");
    await ready(page);
    const trigger = frame(page).locator("[data-probe=trigger]");
    const pop = page.locator("[data-rc-overlay-kind=popover]");

    await trigger.click();
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    await page.mouse.click(900, 600); // host page
    await expect(pop).toHaveCount(0);
    await expect(frame(page).locator("[data-probe=reason]")).toHaveText(
      "outside",
    );

    await trigger.click();
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    await trigger.click(); // click on the anchor: the remote toggles it closed
    await expect(pop).toHaveCount(0);
    await page.waitForTimeout(200);
    await expect(pop).toHaveCount(0);

    await trigger.click();
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    await page
      .frameLocator("[data-rc-overlay-kind=popover] iframe")
      .locator("[data-item=Apple]")
      .focus();
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    await expect(frame(page).locator("[data-probe=reason]")).toHaveText(
      "escape",
    );
    // Focus was in the popover: it returns to the trigger inside the owner remote.
    await expect.poll(() => focused(page)).toBe("/menu-trigger/:trigger");
  });
});

test.describe("overlays: options while open", () => {
  test("placement, offset and label changes apply to an open popover", async ({
    page,
  }) => {
    await page.goto("/?case=overlay-popover-options");
    await ready(page);
    const trigger = frame(page).locator("[data-probe=trigger]");
    await trigger.click();
    const pop = page.locator("[data-rc-overlay-kind=popover]");
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    const t = (await trigger.boundingBox())!;
    const below = (await pop.boundingBox())!;
    expect(below.y).toBeCloseTo(t.y + t.height + 4, 0);
    await expect(pop.locator("iframe")).toHaveAttribute("title", "Fruit");

    await page.evaluate(() =>
      window.__case.set({ side: "top", offset: 12, label: "Fruits" }),
    );
    await expect
      .poll(async () => {
        const b = (await pop.boundingBox())!;
        return b.y + b.height;
      })
      .toBeCloseTo(t.y - 12, 0);
    await expect(pop.locator("iframe")).toHaveAttribute("title", "Fruits");
    // Still the same overlay: open, and its callbacks work.
    await page
      .frameLocator("[data-rc-overlay-kind=popover] iframe")
      .locator("[data-item=Banana]")
      .click();
    await expect(frame(page).locator("[data-probe=selected]")).toHaveText(
      "Banana",
    );
  });
});

test.describe("overlays: tall content", () => {
  test("a popover taller than the room is capped to the viewport and scrolls", async ({
    page,
  }) => {
    await page.goto("/?case=overlay-popover-tall");
    await ready(page);
    await frame(page).locator("[data-probe=trigger]").click();
    const pop = page.locator("[data-rc-overlay-kind=popover]");
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    const vp = page.viewportSize()!;
    await expect
      .poll(
        async () =>
          (await pop.boundingBox())!.y + (await pop.boundingBox())!.height,
      )
      .toBeLessThanOrEqual(vp.height - 8 + 0.5);
    const box = (await pop.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(8 - 0.5);
    const scroller = await pop.evaluate((e) => ({
      sh: e.scrollHeight,
      ch: e.clientHeight,
      sw: e.scrollWidth,
      cw: e.clientWidth,
      ox: getComputedStyle(e).overflowX,
    }));
    expect(scroller.sh).toBeGreaterThan(scroller.ch);
    // No horizontal scrolling: only the iframe's transparent extra pixels (≤2) overflow, clipped.
    expect(scroller.ox).toBe("hidden");
    expect(scroller.sw).toBeLessThanOrEqual(scroller.cw + 2);
    // Wheel over the menu (inside the frame) scrolls the popover.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await expect
      .poll(() => pop.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(0);
    // Focus on an item below the fold scrolls it into view across the frame.
    const menu = page.frameLocator("[data-rc-overlay-kind=popover] iframe");
    await menu.locator('[data-item="Item 60"]').focus();
    const itemVisible = async (): Promise<boolean> => {
      const frameBox = (await pop.locator("iframe").boundingBox())!;
      const item = await menu
        .locator('[data-item="Item 60"]')
        .evaluate(
          (e) =>
            e.getBoundingClientRect().toJSON() as { y: number; height: number },
        );
      const p = (await pop.boundingBox())!;
      const top = frameBox.y + item.y;
      return top >= p.y - 0.5 && top + item.height <= p.y + p.height + 0.5;
    };
    await expect.poll(itemVisible).toBe(true);
    await menu.locator('[data-item="Item 60"]').click();
    await expect(frame(page).locator("[data-probe=selected]")).toHaveText(
      "Item 60",
    );
  });

  test("a short popover does not scroll", async ({ page }) => {
    await page.goto("/?case=overlay-popover-scroll");
    await ready(page);
    await frame(page).locator("[data-probe=trigger]").click();
    const pop = page.locator("[data-rc-overlay-kind=popover]");
    await expect(pop.locator("[data-rc-revealed]")).toHaveCount(1);
    expect(await pop.evaluate((e) => getComputedStyle(e).overflowY)).toBe(
      "visible",
    );
  });
});

test.describe("overlays: dialog", () => {
  test("modal: focus moves in, Tab is trapped, confirm calls back, focus is restored", async ({
    page,
  }) => {
    await page.goto("/?case=overlay-dialog");
    await ready(page);
    const open = frame(page).locator("[data-probe=open-dialog]");
    await open.click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-label", "Confirm action");
    await expect(page.locator("[data-rc-overlay-kind=dialog]")).toBeVisible();
    await expect.poll(() => focused(page)).toBe("/confirm/:dialog-input");
    // The rest of the page is inert.
    await expect(page.locator("#root")).toHaveAttribute("inert", "");
    await page.keyboard.type("hello");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/confirm/:ok");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/confirm/:cancel");
    await page.keyboard.press("Tab"); // wraps via the end sentinel
    await expect.poll(() => focused(page)).toBe("/confirm/:dialog-input");
    await page.keyboard.press("Shift+Tab"); // wraps backwards
    await expect.poll(() => focused(page)).toBe("/confirm/:cancel");
    await page
      .frameLocator("[data-rc-overlay-kind=dialog] iframe")
      .locator("[data-probe=ok]")
      .click();
    await expect(frame(page).locator("[data-probe=result]")).toHaveText(
      "confirmed:hello",
    );
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
    await expect.poll(() => focused(page)).toBe("/dialog-trigger/:open-dialog");
  });

  test("Escape and backdrop click dismiss", async ({ page }) => {
    await page.goto("/?case=overlay-dialog");
    await ready(page);
    const open = frame(page).locator("[data-probe=open-dialog]");
    await open.click();
    await expect(
      page.locator("[data-rc-overlay-kind=dialog] [data-rc-revealed]"),
    ).toHaveCount(1);
    await expect.poll(() => focused(page)).toBe("/confirm/:dialog-input");
    await page.keyboard.press("Escape");
    await expect(frame(page).locator("[data-probe=result]")).toHaveText(
      "dismissed:escape",
    );
    // Focus is back on the trigger. Escape is a key, so the ring shows, as inline.
    await expect.poll(() => focused(page)).toBe("/dialog-trigger/:open-dialog");
    expect(await open.evaluate((e) => e.matches(":focus-visible"))).toBe(true);
    await open.click();
    await expect(
      page.locator("[data-rc-overlay-kind=dialog] [data-rc-revealed]"),
    ).toHaveCount(1);
    await page.mouse.click(5, 5);
    await expect(frame(page).locator("[data-probe=result]")).toHaveText(
      "dismissed:outside",
    );
  });
});

test.describe("focus", () => {
  test("Tab order enters and leaves the frame in both directions", async ({
    page,
  }) => {
    await page.goto("/?case=focus-order");
    await ready(page);
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:first");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:second");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("host:after");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:second");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("host:before");
  });

  test("Tab order runs through a remote inside a host shadow root", async ({
    page,
  }) => {
    await page.goto("/?case=focus-shadow");
    await ready(page);
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("host:in-shadow");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:first");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:second");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("host:after");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:second");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:first");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("host:in-shadow");
  });

  test("Tab into a remote shows the focus ring even after a click inside it", async ({
    page,
  }) => {
    await page.goto("/?case=focus-visible");
    await ready(page);
    const visible = (probe: string) =>
      frame(page)
        .locator(`[data-probe=${probe}]`)
        .evaluate((e) => e.matches(":focus-visible"));
    // Take focus out of the frame from the host side (engines differ on
    // whether a click on the page or focus() does that while a frame has it).
    const leaveFrame = () =>
      page.evaluate(() =>
        document.activeElement instanceof HTMLIFrameElement
          ? document.activeElement.blur()
          : undefined,
      );
    // A click inside the remote makes its document think input is by pointer.
    await frame(page).locator("[data-probe=two]").click();
    expect(await visible("two")).toBe(false);
    await leaveFrame();
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/buttons/:one");
    expect(await visible("one")).toBe(true);
    await frame(page).locator("[data-probe=one]").click();
    await leaveFrame();
    await page.locator("#after").focus();
    await expect.poll(() => focused(page)).toBe("host:after");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/buttons/:two");
    expect(await visible("two")).toBe(true);
  });

  test("a radio group is one tab stop across the frame edge", async ({
    page,
  }) => {
    await page.goto("/?case=focus-radios");
    await ready(page);
    // Shift+Tab into the remote lands on the checked radio, as inline.
    await page.locator("#after").focus();
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/radios/:m");
    // Tab from the group leaves the remote.
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("host:after");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/radios/:m");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/radios/:start");
  });

  test("ref.focus() right after a Tab goes where it was asked", async ({
    page,
  }) => {
    await page.goto("/?case=focus-programmatic");
    await ready(page);
    // Shift+Tab into the remote, then click a host button within a second.
    await page.locator("#after").focus();
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:second");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => focused(page)).toBe("/focus/:first");
    await page.locator("#focus-first").click();
    await expect.poll(() => focused(page)).toBe("/focus/:first");
    // Keyboard: Tab to the button and press Enter (no pointer to end the Tab).
    await page.waitForTimeout(600); // the remote holds a focused stop for 30 frames
    await page.evaluate(() =>
      document.activeElement instanceof HTMLIFrameElement
        ? document.activeElement.blur()
        : undefined,
    );
    await page.locator("#after").focus();
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("host:focus-first");
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("host:focus-last");
    await page.keyboard.press("Enter");
    await expect.poll(() => focused(page)).toBe("/focus/:second");
    // Stays there (a late report of the frame's focus does not move it).
    await page.waitForTimeout(300);
    expect(await focused(page)).toBe("/focus/:second");
  });

  test("focus from a click does not scroll host scrollers; Tab does", async ({
    page,
  }) => {
    await page.goto("/?case=reveal-click");
    await ready(page);
    const scroller = page.locator("#scroller");
    const scrollTop = () => scroller.evaluate((e) => e.scrollTop);
    expect(
      await scroller.evaluate((e) => e.scrollHeight > e.clientHeight),
    ).toBe(true);
    // Click the visible top of the first button (no scrolling into view first).
    const box = (await page.locator("#remote iframe").boundingBox())!;
    const one = await frame(page)
      .locator("[data-probe=one]")
      .evaluate(
        (e) => e.getBoundingClientRect().toJSON() as { x: number; y: number },
      );
    await page.mouse.click(box.x + one.x + 6, box.y + one.y + 3);
    await expect.poll(() => focused(page)).toBe("/buttons/:one");
    await page.waitForTimeout(300);
    expect(await scrollTop()).toBe(0);
    // Keyboard focus still reveals the whole button.
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect.poll(() => focused(page)).toBe("/buttons/:one");
    await expect.poll(scrollTop).toBeGreaterThan(0);
  });

  test("iframe has an accessible title", async ({ page }) => {
    await page.goto("/?case=focus-order");
    await expect(page.locator("#remote iframe")).toHaveAttribute(
      "title",
      "Remote component",
    );
  });
});

test.describe("theme", () => {
  test("follows :hover and :focus-within on slot ancestors", async ({
    page,
  }) => {
    await page.goto("/?case=theme-hover");
    await ready(page, 2);
    const color = (id: string) =>
      frame(page, id)
        .locator("[data-probe=text]")
        .evaluate((e) => getComputedStyle(e).color);
    expect(await color("h")).toBe("rgb(10, 10, 10)");
    // Pointer on the host part of the card, then on the remote itself.
    await page.locator("#hov-label").hover();
    await expect.poll(() => color("h")).toBe("rgb(200, 0, 0)");
    await page.mouse.move(1000, 700);
    await expect.poll(() => color("h")).toBe("rgb(10, 10, 10)");
    await frame(page, "h").locator("[data-probe=text]").hover();
    await expect.poll(() => color("h")).toBe("rgb(200, 0, 0)");
    await page.mouse.move(1000, 700);
    await expect.poll(() => color("h")).toBe("rgb(10, 10, 10)");
    // Focus inside the container.
    expect(await color("f")).toBe("rgb(10, 10, 10)");
    await page.locator("#fw-input").focus();
    await expect.poll(() => color("f")).toBe("rgb(0, 0, 200)");
    await page.locator("#away").focus();
    await expect.poll(() => color("f")).toBe("rgb(10, 10, 10)");
  });
});

test.describe("loading and errors", () => {
  test("fallback until ready, then the remote", async ({ page }) => {
    // Not "load": that waits for the (slow) frame too.
    await page.goto("/?case=loading", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#fallback")).toBeVisible();
    await expect(page.locator("#remote [data-rc-slot]")).toHaveAttribute(
      "data-rc-status",
      "loading",
    );
    await expect(page.locator("#remote iframe")).toHaveCSS(
      "visibility",
      "hidden",
    );
    await ready(page);
    await expect(page.locator("#fallback")).toHaveCount(0);
    await expect(frame(page).locator("[data-probe=slow]")).toHaveText(
      "Loaded slowly",
    );
    expect((await events(page)).filter((e) => e.type === "ready")).toHaveLength(
      1,
    );
  });

  test("an uncaught render error is a non-fatal runtime error; the remote stays up", async ({
    page,
  }) => {
    await page.goto("/?case=error-render");
    // Revealed, though empty: React unmounted the root.
    await expect(page.locator("#remote [data-rc-slot]")).toHaveAttribute(
      "data-rc-revealed",
      "",
      { timeout: 15_000 },
    );
    await expect
      .poll(async () => (await events(page)).filter((e) => e.type === "error"))
      .toContainEqual(
        expect.objectContaining({
          code: "runtime",
          fatal: false,
          message: expect.stringContaining("Boom"),
        }),
      );
    await expect(page.locator("#remote [data-rc-slot]")).toHaveAttribute(
      "data-rc-status",
      "ready",
    );
    await expect(page.locator("#error")).toHaveCount(0);
  });

  test("a URL that is not a remote reports load", async ({ page }) => {
    await page.goto("/?case=error-load");
    await expect(page.locator("#error")).toHaveText("load", {
      timeout: 10_000,
    });
  });

  test("timeout, then retry", async ({ page }) => {
    await page.goto("/?case=error-timeout");
    await expect(page.locator("#error")).toHaveText("timeout", {
      timeout: 5_000,
    });
    await page.locator("#error").click();
    await expect(page.locator("#fallback")).toBeVisible();
    await expect(page.locator("#error")).toHaveText("timeout", {
      timeout: 5_000,
    });
  });
});

test.describe("props and RPC", () => {
  test("structured values, callbacks with promises, errors, latest-ref, updates", async ({
    page,
  }) => {
    await page.goto("/?case=props-rpc");
    await ready(page);
    const f = frame(page);
    await expect(f.locator("[data-probe=count]")).toHaveText("0");
    await expect(f.locator("[data-probe=date]")).toHaveText(
      "2024-01-02T03:04:05.000Z",
    );
    await expect(f.locator("[data-probe=map]")).toHaveText("a=1,b=2");
    await expect(f.locator("[data-probe=has-missing]")).toHaveText("true");
    const out = f.locator("[data-probe=out]");
    await f.locator("[data-probe=compute]").click();
    await expect(out).toContainText('"compute":"5"');
    await page.evaluate(() => window.__case.set({ bonus: 10 }));
    await f.locator("[data-probe=compute]").click();
    await expect(out).toContainText('"compute":"15"');
    await f.locator("[data-probe=fail]").click();
    await expect(out).toContainText('"fail":"ValidationError:nope"');
    await f.locator("[data-probe=nested]").click();
    await expect(out).toContainText('"nested":"42"');
    await f.locator("[data-probe=bad-arg]").click();
    await expect(out).toContainText('"bad-arg":"data"');
    await page.evaluate(() => window.__case.set({ count: 3 }));
    await expect(f.locator("[data-probe=count]")).toHaveText("3");
    // Host re-renders create new function identities; the remote's proxy stays stable.
    await expect(f.locator("[data-probe=identity]")).toHaveText("1");
  });
});

test.describe("lifecycle", () => {
  test("many instances all become ready", async ({ page }) => {
    await page.goto("/?case=many-instances");
    await expect(
      page.locator("#remote [data-rc-slot][data-rc-revealed]"),
    ).toHaveCount(40, { timeout: 20_000 });
  });

  test("lazy: not loaded until near the viewport", async ({ page }) => {
    await page.goto("/?case=lazy");
    await page.waitForTimeout(500);
    await expect(page.locator("#remote [data-rc-slot]")).toHaveAttribute(
      "data-rc-status",
      "idle",
    );
    expect(await page.locator("#remote iframe").getAttribute("src")).toBeNull();
    await page.locator("#remote [data-rc-slot]").scrollIntoViewIfNeeded();
    await expect(page.locator("#remote [data-rc-slot]")).toHaveAttribute(
      "data-rc-status",
      "ready",
    );
  });

  test("theme changes are re-sent", async ({ page }) => {
    await page.goto("/?case=theme-change");
    await ready(page);
    const scheme = () =>
      frame(page)
        .locator("html")
        .evaluate((e) => getComputedStyle(e).colorScheme);
    expect(await scheme()).toBe("light");
    await page.evaluate(() => window.__case.set({ dark: true }));
    await expect.poll(scheme).toBe("dark");
    await expect(frame(page).locator("p")).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
  });
});

test.describe("security", () => {
  test("own-origin and opaque sandboxes; same-origin remote refused", async ({
    page,
  }) => {
    await page.goto("/?case=security");
    await expect(
      page
        .locator("#remote .subject-own [data-rc-revealed]")
        .or(page.locator("#remote .subject-own[data-rc-revealed]")),
    ).toHaveCount(1, { timeout: 15_000 });
    await expect(
      page.locator("#remote .subject-opaque[data-rc-revealed]"),
    ).toHaveCount(1, { timeout: 15_000 });
    const own = JSON.parse(
      (await frame(page, "own")
        .locator("[data-probe=security]")
        .textContent())!,
    ) as Record<string, string>;
    expect(own.parentDoc).toMatch(/^blocked/);
    expect(own.topLocation).toMatch(/^blocked/);
    expect(own.storage).toBe("ok:1");
    expect(own.origin).toBe("http://127.0.0.1:5181");
    const opaque = JSON.parse(
      (await frame(page, "opaque")
        .locator("[data-probe=security]")
        .textContent())!,
    ) as Record<string, string>;
    expect(opaque.parentDoc).toMatch(/^blocked/);
    expect(opaque.storage).toMatch(/^blocked/);
    expect(opaque.cookie).toMatch(/^blocked/);
    expect(opaque.origin).toBe("null");
    await expect(page.locator("#same-origin-error")).toHaveText("security");
  });

  test("forged handshake messages are ignored", async ({ page }) => {
    await page.goto("/?case=auto-height");
    await expect(page.locator("#remote [data-rc-revealed]")).toHaveCount(1);
    // An rc/initialize posted by the host page itself (wrong source) for the frame's nonce is ignored.
    const before = await page.evaluate(() => window.__events.length);
    await page.evaluate(() => {
      const src =
        document.querySelector<HTMLIFrameElement>("#remote iframe")!.src;
      const nonce = new URLSearchParams(new URL(src).hash.slice(1)).get(
        "rc-nonce",
      )!;
      const session = "forged-session";
      window.postMessage(
        {
          jsonrpc: "2.0",
          id: session,
          method: "rc/initialize",
          params: {
            nonce,
            session,
            protocol: { min: 3, max: 3 },
            runtime: "evil",
          },
        },
        "*",
      );
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__events.length)).toBe(before);
    await expect(page.locator("#remote [data-rc-slot]")).toHaveAttribute(
      "data-rc-status",
      "ready",
    );
  });
});

test.describe("safe-content-frame isolation", () => {
  test("runs on a hashed SCF origin with props, RPC, overlays", async ({
    page,
  }) => {
    await page.goto("/?case=scf-behaviour");
    await expect(
      page.locator("#remote [data-rc-slot][data-rc-revealed]"),
    ).toHaveCount(3, { timeout: 20_000 });
    const sec = JSON.parse(
      (await frame(page, "sec")
        .locator("[data-probe=security]")
        .textContent())!,
    ) as Record<string, string>;
    expect(sec.origin).toMatch(
      /^https:\/\/[0-9a-z]{50}-h184756\.rc\.localhost$/,
    );
    expect(sec.parentDoc).toMatch(/^blocked/);
    expect(sec.storage).toBe("ok:1");
    const rpc = frame(page, "rpc");
    await rpc.locator("[data-probe=compute]").click();
    await expect(rpc.locator("[data-probe=out]")).toContainText(
      '"compute":"5"',
    );
    await page.evaluate(() => window.__case.set({ count: 7 }));
    await expect(rpc.locator("[data-probe=count]")).toHaveText("7");
    // Same publisher ⇒ same hashed origin for every instance (salt "publisher").
    const origins = await page
      .locator("#remote iframe")
      .evaluateAll((els) =>
        els.map((e) => new URL((e as HTMLIFrameElement).src).origin),
      );
    expect(new Set(origins).size).toBe(1);
    await frame(page, "menu").locator("[data-probe=trigger]").click();
    // Overlay content inherits SCF isolation: same hashed origin as its owner.
    const pop = page.locator("[data-rc-overlay-kind=popover] iframe");
    await expect(
      page.locator("[data-rc-overlay-kind=popover] [data-rc-revealed]"),
    ).toHaveCount(1);
    const popOrigin = await pop.evaluate(
      (e) => new URL((e as HTMLIFrameElement).src).origin,
    );
    expect(popOrigin).toBe(origins[0]);
    await page
      .frameLocator("[data-rc-overlay-kind=popover] iframe")
      .locator("[data-item=Banana]")
      .click();
    await expect(
      frame(page, "menu").locator("[data-probe=selected]"),
    ).toHaveText("Banana");
  });

  test('salt "instance": one hashed origin per instanceId', async ({
    page,
  }) => {
    await page.goto("/?case=scf-instance");
    await expect(
      page.locator("#remote [data-rc-slot][data-rc-revealed]"),
    ).toHaveCount(3, { timeout: 20_000 });
    const origin = async (id: string) =>
      (
        JSON.parse(
          (await frame(page, id)
            .locator("[data-probe=security]")
            .textContent())!,
        ) as Record<string, string>
      ).origin;
    const [a, a2, b] = [
      await origin("a"),
      await origin("a2"),
      await origin("b"),
    ];
    expect(a).toMatch(/^https:\/\/[0-9a-z]{50}-h184756\.rc\.localhost$/);
    expect(a2).toBe(a);
    expect(b).not.toBe(a);
  });
});

test.describe("network policy", () => {
  test("public by default (https only), host allowlist, host off switch", async ({
    page,
    browserName,
  }) => {
    await page.goto("/?case=network");
    // Every engine loads all four; only Chromium enforces <iframe csp> on the last.
    await ready(page, 4);
    const run = async (id: string): Promise<string> => {
      await frame(page, id).locator("[data-probe=loopback]").click();
      await expect(frame(page, id).locator("[data-probe=out]")).toContainText(
        "loopback",
      );
      return (await frame(page, id).locator("[data-probe=out]").textContent())!;
    };
    // Serving layer default: connect-src https: wss: (loopback http is not public).
    expect(await run("public")).toContain('"loopback":"error:TypeError"');
    // Host allowlist that includes the server: allowed, credential-less, CORS as usual.
    expect(await run("list")).toContain('"loopback":"ok:200"');
    // Host off switch.
    expect(await run("none")).toContain('"loopback":"error:TypeError"');
    // URL remote locked down with <iframe csp> (CSP Embedded Enforcement: Chromium).
    expect(
      await page
        .locator("#remote .subject-url-none iframe")
        .getAttribute("csp"),
    ).toBe("connect-src 'none'");
    if (browserName === "chromium")
      expect(await run("url-none")).toContain('"loopback":"error:TypeError"');
  });
});

test.describe("html prop", () => {
  for (const scf of [false, true]) {
    test(`a document from the host renders, binds props, calls back, opens an HTML overlay${scf ? " (SCF)" : ""}`, async ({
      page,
    }) => {
      await page.goto(`/?case=html-prop${scf ? "&scf=1" : ""}`);
      await ready(page);
      const f = frame(page);
      await expect(f.locator("[data-probe=name]")).toHaveText("Ada");
      const origin = await f.locator("html").evaluate(() => self.origin);
      if (scf)
        expect(origin).toMatch(
          /^https:\/\/[0-9a-z]{50}-h184756\.rc\.localhost$/,
        );
      else expect(origin).toBe("null");
      await page.evaluate(() => window.__case.set({ name: "Grace" }));
      await expect(f.locator("[data-probe=name]")).toHaveText("Grace");
      await f.locator("[data-probe=pick]").click();
      await expect
        .poll(async () =>
          (await events(page))
            .filter((e) => e.type === "pick")
            .map((e) => e.message),
        )
        .toEqual(["blue"]);
      // The slot is as tall as the content.
      const slot = (await page
        .locator("#remote [data-rc-slot]")
        .boundingBox())!;
      const content = await f
        .locator("html")
        .evaluate((e) => e.getBoundingClientRect().height);
      expect(Math.abs(slot.height - content)).toBeLessThan(0.6);
      await f.locator("[data-probe=open]").click();
      await expect(
        page.locator("[data-rc-overlay-kind=popover] [data-rc-revealed]"),
      ).toHaveCount(1);
      await page
        .frameLocator("[data-rc-overlay-kind=popover] iframe")
        .locator("[data-probe=item]")
        .click();
      await expect(f.locator("[data-probe=picked]")).toHaveText("one");
    });
  }
});

test.describe("reload", () => {
  test("ref.reload() and remote self-reload reconnect with a fresh document and current props", async ({
    page,
  }) => {
    await page.goto("/?case=reload");
    await ready(page);
    const items = () => frame(page).locator("li");
    await frame(page).locator("[data-probe=add]").click();
    await expect(items()).toHaveCount(2);
    // The remote document reloads itself: an rc/initialize with a new session; the host reconnects.
    await frame(page)
      .locator("[data-action=self-reload]")
      .evaluate((b) => (b as HTMLButtonElement).click());
    await expect(items()).toHaveCount(1);
    await frame(page).locator("[data-probe=add]").click();
    await expect(items()).toHaveCount(2);
    // Host-initiated reload: back to loading, then ready again.
    await page.evaluate(() =>
      (window as unknown as { __handle: { reload(): void } }).__handle.reload(),
    );
    await expect(page.locator("#remote [data-rc-slot]")).toHaveAttribute(
      "data-rc-status",
      "ready",
    );
    await expect(items()).toHaveCount(1);
    const readies = (await events(page)).filter(
      (e) => e.type === "ready",
    ).length;
    expect(readies).toBeGreaterThanOrEqual(2);
  });
});

test.describe("resize feedback loops", () => {
  /** Counts `rc/notifications/size-changed` messages each remote frame sends (patched into every frame). */
  const countSizes = (page: Page) =>
    page.addInitScript(() => {
      const w = window as unknown as { __sizes: number };
      w.__sizes = 0;
      const post = MessagePort.prototype.postMessage;
      MessagePort.prototype.postMessage = function (
        this: MessagePort,
        m: unknown,
        ...rest: unknown[]
      ) {
        if (
          m !== null &&
          typeof m === "object" &&
          (m as { method?: unknown }).method === "rc/notifications/size-changed"
        )
          w.__sizes++;
        return (post as (...a: unknown[]) => void).call(this, m, ...rest);
      };
    });
  const sizes = async (page: Page): Promise<number> => {
    let n = 0;
    for (const f of page.frames())
      if (f !== page.mainFrame())
        n += await f
          .evaluate(
            () => (window as unknown as { __sizes?: number }).__sizes ?? 0,
          )
          .catch(() => 0);
    return n;
  };

  test("a host whose width depends on height settles instead of flipping", async ({
    page,
  }) => {
    await countSizes(page);
    await page.goto("/?case=feedback-loop");
    await ready(page);
    await page.waitForTimeout(1500);
    const before = await sizes(page);
    await page.waitForTimeout(1000);
    expect(await sizes(page), "size messages after settling").toBe(before);
    // Settled the way browsers settle scrollbars: narrow width, tall height.
    const box = (await page.locator("[data-loop-box]").boundingBox())!;
    expect(box.width).toBe(200);
    expect(box.height).toBe(300);
  });

  test("scrollbar case sends a bounded number of size messages", async ({
    page,
  }) => {
    await countSizes(page);
    await page.goto("/?case=scrollbar-loop");
    await settleRemote(page);
    await page.waitForTimeout(1000);
    expect(await sizes(page)).toBeLessThanOrEqual(8);
  });
});

test.describe("built output", () => {
  test.skip(process.env.RC_REMOTE !== "build", "build mode only");
  test("remotes come from vite build: hashed assets, manifest, single-file", async ({
    request,
  }) => {
    const html = await (
      await request.get("http://127.0.0.1:5181/text/")
    ).text();
    expect(html).not.toContain("@vite/client");
    expect(html).toMatch(
      /<script type="module" src="\/assets\/[^"]+\.js"><\/script>/,
    );
    expect(html).toMatch(/<script src="\/rc-runtime\.js"><\/script>/);
    expect(
      await (await request.get("http://127.0.0.1:5181/rc-runtime.js")).text(),
    ).toContain("@assistant-ui/remote-components-runtime");
    const manifest = (await (
      await request.get("http://127.0.0.1:5181/remote-components.json")
    ).json()) as {
      protocol: unknown;
      components: Record<string, { html: string }>;
    };
    expect(manifest.protocol).toBe(3);
    expect(manifest.components.text?.html).toBe("text/index.html");
    const single = await (
      await request.get("http://127.0.0.1:5181/text/single.html")
    ).text();
    expect(single).not.toMatch(/<script[^>]+src=/);
    expect(single).toContain("data-rc-runtime");
    // Public network by default (SPEC §12).
    expect(
      await (await request.get("http://127.0.0.1:5181/_headers")).text(),
    ).toContain("Content-Security-Policy: connect-src https: wss:");
  });
});
