// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResizableWidth } from "./use-resizable-width";

const target = () => ({
  setPointerCapture: vi.fn(),
  releasePointerCapture: vi.fn(),
});

const pointer = (clientX: number, currentTarget = target()) =>
  ({
    pointerId: 1,
    clientX,
    currentTarget,
    preventDefault: vi.fn(),
  }) as never;

const key = (name: string) => ({ key: name, preventDefault: vi.fn() }) as never;

beforeEach(() => {
  window.innerWidth = 1000;
});

describe("useResizableWidth", () => {
  it("has no width until the user resizes", () => {
    const { result } = renderHook(useResizableWidth);
    expect(result.current.width).toBeUndefined();
    expect(result.current.handle["aria-valuenow"]).toBe(384);
  });

  it("follows the pointer from the right edge while captured, within the bounds", () => {
    const { result } = renderHook(useResizableWidth);
    const element = target();
    act(() => result.current.handle.onPointerMove(pointer(500)));
    expect(result.current.width).toBeUndefined();
    act(() => result.current.handle.onPointerDown(pointer(700, element)));
    expect(element.setPointerCapture).toHaveBeenCalledWith(1);
    act(() => result.current.handle.onPointerMove(pointer(500)));
    expect(result.current.width).toBe(500);
    act(() => result.current.handle.onPointerMove(pointer(900)));
    expect(result.current.width).toBe(320);
    act(() => result.current.handle.onPointerMove(pointer(10)));
    expect(result.current.width).toBe(936);
    act(() => result.current.handle.onPointerUp(pointer(10, element)));
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1);
    act(() => result.current.handle.onPointerMove(pointer(500)));
    expect(result.current.width).toBe(936);
  });

  it("steps with the arrow keys and jumps with Home and End", () => {
    const { result } = renderHook(useResizableWidth);
    act(() => result.current.handle.onKeyDown(key("ArrowLeft")));
    expect(result.current.width).toBe(408);
    act(() => result.current.handle.onKeyDown(key("ArrowRight")));
    act(() => result.current.handle.onKeyDown(key("ArrowRight")));
    expect(result.current.width).toBe(360);
    act(() => result.current.handle.onKeyDown(key("Home")));
    expect(result.current.width).toBe(320);
    act(() => result.current.handle.onKeyDown(key("ArrowRight")));
    expect(result.current.width).toBe(320);
    act(() => result.current.handle.onKeyDown(key("End")));
    expect(result.current.width).toBe(936);
    act(() => result.current.handle.onKeyDown(key("Tab")));
    expect(result.current.width).toBe(936);
    expect(result.current.handle["aria-valuenow"]).toBe(936);
  });
});
