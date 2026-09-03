// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSearchMark, revealPageMatch } from "./reveal";

function nextFrames(count: number) {
  for (let i = 0; i < count; i += 1) {
    vi.advanceTimersToNextFrame();
  }
}

function paragraph(text: string) {
  const element = document.createElement("p");
  element.textContent = text;
  document.body.append(element);
  element.scrollIntoView = vi.fn();
  return element;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  clearSearchMark();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-base-ui-scroll-locked");
  vi.useRealTimers();
});

describe("revealPageMatch", () => {
  it("waits for the page scroll lock to lift before scrolling", () => {
    document.documentElement.setAttribute("data-base-ui-scroll-locked", "");
    const element = paragraph("a formatter receives one snapshot entry");

    revealPageMatch(element, "center");
    nextFrames(3);
    expect(element.scrollIntoView).not.toHaveBeenCalled();

    document.documentElement.removeAttribute("data-base-ui-scroll-locked");
    nextFrames(1);
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });

  it("scrolls once the frame budget runs out even if the lock never lifts", () => {
    document.documentElement.setAttribute("data-base-ui-scroll-locked", "");
    const element = paragraph("a formatter receives one snapshot entry");

    revealPageMatch(element, "start");
    nextFrames(61);

    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("skips a target detached before the lock lifted", () => {
    const element = paragraph("a formatter receives one snapshot entry");
    element.remove();

    revealPageMatch(element, "center");
    nextFrames(1);

    expect(element.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("the reveal mark", () => {
  it("holds off until the smooth scroll has landed", () => {
    const element = paragraph("a formatter receives one snapshot entry");
    let offset = 0;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => offset);

    revealPageMatch(element, "center");
    nextFrames(1);

    for (let step = 0; step < 4; step += 1) {
      offset += 400;
      nextFrames(1);
      expect(element.hasAttribute("data-search-reveal")).toBe(false);
    }

    nextFrames(4);
    expect(element.hasAttribute("data-search-reveal")).toBe(true);
  });

  it("marks promptly when the scroll lands instantly", () => {
    const element = paragraph("a formatter receives one snapshot entry");
    let offset = 0;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => offset);
    element.scrollIntoView = vi.fn(() => {
      offset = 3670;
    });

    revealPageMatch(element, "center");
    nextFrames(5);

    expect(element.hasAttribute("data-search-reveal")).toBe(true);
  });

  it("falls back to marking when the target needs no scroll at all", () => {
    const element = paragraph("a formatter receives one snapshot entry");
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => 0);

    revealPageMatch(element, "center");
    nextFrames(3);
    expect(element.hasAttribute("data-search-reveal")).toBe(false);

    nextFrames(4);
    expect(element.hasAttribute("data-search-reveal")).toBe(true);
  });

  it("marks the target and expires on its own", () => {
    const element = paragraph("a formatter receives one snapshot entry");

    revealPageMatch(element, "center");
    nextFrames(8);
    expect(element.hasAttribute("data-search-reveal")).toBe(true);

    vi.advanceTimersByTime(2400);
    expect(element.hasAttribute("data-search-reveal")).toBe(false);
  });

  it("drops a reveal still waiting on the scroll lock when another is selected", () => {
    document.documentElement.setAttribute("data-base-ui-scroll-locked", "");
    const first = paragraph("a formatter receives one snapshot entry");
    const second = paragraph("the snapshot carries a shallow diff");

    revealPageMatch(first, "center");
    nextFrames(2);
    revealPageMatch(second, "center");
    document.documentElement.removeAttribute("data-base-ui-scroll-locked");
    nextFrames(8);

    expect(first.scrollIntoView).not.toHaveBeenCalled();
    expect(first.hasAttribute("data-search-reveal")).toBe(false);
    expect(second.scrollIntoView).toHaveBeenCalled();
    expect(second.hasAttribute("data-search-reveal")).toBe(true);
  });

  it("drops a reveal still waiting on the scroll to land when another is selected", () => {
    const first = paragraph("a formatter receives one snapshot entry");
    const second = paragraph("the snapshot carries a shallow diff");
    let offset = 0;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => offset);

    revealPageMatch(first, "center");
    nextFrames(1);
    offset += 400;
    nextFrames(1);
    expect(first.scrollIntoView).toHaveBeenCalled();

    revealPageMatch(second, "center");
    nextFrames(8);

    expect(first.hasAttribute("data-search-reveal")).toBe(false);
    expect(second.hasAttribute("data-search-reveal")).toBe(true);

    vi.advanceTimersByTime(2400);
    expect(second.hasAttribute("data-search-reveal")).toBe(false);
  });

  it("moves off the previous target when another match is revealed", () => {
    const first = paragraph("a formatter receives one snapshot entry");
    const second = paragraph("the snapshot carries a shallow diff");

    revealPageMatch(first, "center");
    nextFrames(8);
    revealPageMatch(second, "center");
    nextFrames(8);

    expect(first.hasAttribute("data-search-reveal")).toBe(false);
    expect(second.hasAttribute("data-search-reveal")).toBe(true);
  });
});
