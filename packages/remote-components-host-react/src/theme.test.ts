// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { changedContainSlot } from "./theme.js";

describe("hover and focus-within changes", () => {
  document.body.innerHTML = `
    <main id="main">
      <section id="card"><p id="title">t</p><div data-rc-slot id="slot"><div data-rc-sizer><iframe id="frame"></iframe></div></div></section>
      <aside id="side"><button id="a">a</button><button id="b">b</button></aside>
    </main>`;
  const $ = (id: string) => document.getElementById(id);
  const changed = (from: string | null, to: string | null) =>
    changedContainSlot(from ? $(from) : null, to ? $(to) : null) ||
    changedContainSlot(to ? $(to) : null, from ? $(from) : null);

  it("re-reads when an ancestor of a slot gains or loses the pointer or focus", () => {
    expect(changed("title", "a")).toBe(true); // #card changed
    expect(changed("frame", "b")).toBe(true); // into the remote: the slot and #card
    expect(changed("frame", null)).toBe(true); // from outside the window
  });

  it("ignores moves that change no element containing a slot", () => {
    expect(changed("a", "b")).toBe(false); // only the buttons changed
    expect(changed("a", "side")).toBe(false);
  });

  it("counts the slot's own state", () => {
    expect(changed("title", "slot")).toBe(true);
  });
});
