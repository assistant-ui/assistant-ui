import { describe, it, expect, vi, beforeEach } from "vitest";
import { SafeContentFrameSandbox } from "../sandbox/safeContentFrameSandbox";
import type { ToolUIHtmlOutput } from "../renderer/types";
import type { ToolUIInstance } from "../core/instance";

vi.mock("safe-content-frame", () => {
  class MockSafeContentFrame {
    async renderHtml(_html: string, container: HTMLElement) {
      const iframe = document.createElement("iframe");

      const frame = {
        iframe,
        origin: "mock-origin",
        sendMessage: vi.fn(),
        fullyLoadedPromiseWithTimeout: vi.fn(async () => {}),
        dispose: vi.fn(),
      };

      container.appendChild(iframe);

      return frame;
    }
  }

  return {
    SafeContentFrame: MockSafeContentFrame,
  };
});

describe("SafeContentFrameSandbox", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  function makeHtmlOutput(html: string, height?: number): ToolUIHtmlOutput {
    return {
      kind: "html",
      html,
      height,
    };
  }

  const fakeInstance = {} as ToolUIInstance;

  it("mounts html output using SafeContentFrame", async () => {
    const sandbox = new SafeContentFrameSandbox();

    const output = makeHtmlOutput("<h1>Hello</h1>", 120);

    await sandbox.mount(fakeInstance, output, container);

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe!.style.height).toBe("120px");
  });

  it("updates by disposing old frame and re-rendering", async () => {
    const sandbox = new SafeContentFrameSandbox();

    const first = makeHtmlOutput("<h1>First</h1>");
    const second = makeHtmlOutput("<h1>Second</h1>");

    await sandbox.mount(fakeInstance, first, container);

    const iframe1 = container.querySelector("iframe");
    expect(iframe1).not.toBeNull();

    await sandbox.update(fakeInstance, second);

    const iframe2 = container.querySelector("iframe");
    expect(iframe2).not.toBeNull();
    expect(iframe2).not.toBe(iframe1);
  });

  it("unmount disposes frame and clears container", async () => {
    const sandbox = new SafeContentFrameSandbox();

    const output = makeHtmlOutput("<h1>Unmount</h1>");

    await sandbox.mount(fakeInstance, output, container);

    expect(container.querySelector("iframe")).not.toBeNull();

    sandbox.unmount();

    expect(container.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("ignores non-html outputs on update", async () => {
    const sandbox = new SafeContentFrameSandbox();

    const output = makeHtmlOutput("<h1>HTML</h1>");
    await sandbox.mount(fakeInstance, output, container);

    await sandbox.update(fakeInstance, {
      kind: "react",
      element: {},
    });

    // iframe still present
    expect(container.querySelector("iframe")).not.toBeNull();
  });
});
