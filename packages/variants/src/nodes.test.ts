import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { measureNodes } from "./nodes";

const boxes: Record<string, DOMRect> = {};
const box = (left: number, top: number, right: number, bottom: number) =>
  ({
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  }) as DOMRect;

beforeEach(() => {
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (
    this: Element,
  ) {
    const rect = boxes[this.id];
    return (rect ? [rect] : []) as unknown as DOMRectList;
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  for (const key of Object.keys(boxes)) delete boxes[key];
  vi.restoreAllMocks();
});

const mount = (html: string) => {
  document.body.innerHTML = html;
  return Array.from(document.body.childNodes);
};

describe("measureNodes", () => {
  it("treats an opaque rgb background as painted", () => {
    boxes["outer"] = box(0, 0, 200, 100);
    boxes["inner"] = box(10, 10, 50, 30);
    const nodes = mount(
      `<div id="outer" style="background-color: rgb(255, 0, 0)"><span id="inner">x</span></div>`,
    );
    expect(measureNodes(nodes)).toMatchObject({ left: 0, right: 200 });
  });

  it("treats a zero-alpha background as transparent", () => {
    boxes["outer"] = box(0, 0, 200, 100);
    boxes["inner"] = box(10, 10, 50, 30);
    const nodes = mount(
      `<div id="outer" style="background-color: rgba(255, 0, 0, 0)"><span id="inner">x</span></div>`,
    );
    expect(measureNodes(nodes)).toMatchObject({ left: 10, right: 50 });
  });

  it("leaves out hidden content but keeps visible descendants", () => {
    boxes["outer"] = box(0, 0, 200, 100);
    boxes["shown"] = box(20, 20, 60, 40);
    boxes["gone"] = box(100, 60, 180, 90);
    const nodes = mount(
      `<div id="outer" style="visibility: hidden; background-color: red"><span id="shown" style="visibility: visible">a</span><span id="gone">b</span></div>`,
    );
    expect(measureNodes(nodes)).toMatchObject({
      left: 20,
      top: 20,
      right: 60,
      bottom: 40,
    });
    const hidden = mount(
      `<div id="outer" style="visibility: hidden"><span id="gone">b</span></div>`,
    );
    expect(measureNodes(hidden)).toBeUndefined();
    const wrapped = mount(
      `<div id="outer"><span id="gone" style="visibility: hidden">b</span></div>`,
    );
    expect(measureNodes(wrapped)).toBeUndefined();
  });
});
