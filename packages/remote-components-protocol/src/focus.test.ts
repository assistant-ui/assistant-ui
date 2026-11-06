// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adjacentTabStop, sameTabStop, tabbables } from "./focus.js";

// jsdom does no layout: report one client rect so elements count as visible.
const original = Element.prototype.getClientRects;
beforeEach(() => {
  Element.prototype.getClientRects = function () {
    return [{}] as unknown as DOMRectList;
  };
});
afterEach(() => {
  Element.prototype.getClientRects = original;
  document.body.innerHTML = "";
});

const ids = (els: Element[]) => els.map((e) => e.id);

describe("tabbables", () => {
  it("treats a radio group as one stop: the checked radio, else the first", () => {
    document.body.innerHTML = `
      <button id="b1"></button>
      <input type="radio" name="size" id="s" />
      <input type="radio" name="size" id="m" checked />
      <input type="radio" name="size" id="l" />
      <input type="radio" name="color" id="red" />
      <input type="radio" name="color" id="blue" />
      <input type="radio" id="lonely" />
      <button id="b2"></button>`;
    expect(ids(tabbables(document))).toEqual([
      "b1",
      "m",
      "red",
      "lonely",
      "b2",
    ]);
    const list = tabbables(document);
    // From any radio of a group, the next stop is after the whole group.
    expect(
      adjacentTabStop(list, document.getElementById("s")!, "next")?.id,
    ).toBe("red");
    expect(
      adjacentTabStop(list, document.getElementById("l")!, "previous")?.id,
    ).toBe("b1");
    expect(
      sameTabStop(document.getElementById("s"), document.getElementById("m")),
    ).toBe(true);
    expect(
      sameTabStop(document.getElementById("s"), document.getElementById("red")),
    ).toBe(false);
  });

  it("keeps groups in different forms apart", () => {
    document.body.innerHTML = `
      <form><input type="radio" name="x" id="a1" /><input type="radio" name="x" id="a2" checked /></form>
      <form><input type="radio" name="x" id="b1" checked /><input type="radio" name="x" id="b2" /></form>`;
    expect(ids(tabbables(document))).toEqual(["a2", "b1"]);
  });

  it("walks open shadow roots and slots in flat tree order", () => {
    document.body.innerHTML = `<button id="before"></button><div id="host"><button id="slotted"></button><button id="unslotted" slot="none"></button></div><button id="after"></button>`;
    const host = document.getElementById("host")!;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<button id="s1"></button><slot></slot><iframe id="frame"></iframe><div inert><button id="dead"></button></div>`;
    expect(ids(tabbables(document))).toEqual([
      "before",
      "s1",
      "slotted",
      "frame",
      "after",
    ]);
    const list = tabbables(document);
    expect(
      adjacentTabStop(list, shadow.getElementById("frame")!, "next")?.id,
    ).toBe("after");
    expect(
      adjacentTabStop(list, shadow.getElementById("frame")!, "previous")?.id,
    ).toBe("slotted");
  });

  it("skips elements under an inert shadow host", () => {
    document.body.innerHTML = `<div id="host" inert></div><button id="b"></button>`;
    document
      .getElementById("host")!
      .attachShadow({ mode: "open" }).innerHTML = `<button id="in"></button>`;
    expect(ids(tabbables(document))).toEqual(["b"]);
  });
});
