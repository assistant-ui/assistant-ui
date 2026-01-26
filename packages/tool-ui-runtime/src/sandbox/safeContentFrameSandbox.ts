import { SafeContentFrame, type SandboxOption } from "safe-content-frame";
import type { RenderedFrame } from "safe-content-frame";
import type { ToolUISandbox } from "./types";
import type { ToolUIInstance } from "../core/instance";
import type { ToolUIRenderOutput, ToolUIHtmlOutput } from "../renderer/types";

export type SafeContentFrameSandboxOptions = {
  sandbox?: readonly SandboxOption[];
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
};

export class SafeContentFrameSandbox implements ToolUISandbox {
  public readonly type = "safe-content-frame" as const;

  private readonly _scf: SafeContentFrame;

  private _frame: RenderedFrame | null = null;
  private _container: HTMLElement | null = null;

  constructor(options: SafeContentFrameSandboxOptions = {}) {
    const scfOptions: any = {};

    if (options.sandbox !== undefined) {
      scfOptions.sandbox = options.sandbox;
    }

    if (options.useShadowDom !== undefined) {
      scfOptions.useShadowDom = options.useShadowDom;
    }

    if (options.enableBrowserCaching !== undefined) {
      scfOptions.enableBrowserCaching = options.enableBrowserCaching;
    }

    this._scf = new SafeContentFrame("tool-ui", scfOptions);
  }

  public async mount(
    _instance: ToolUIInstance,
    output: ToolUIRenderOutput,
    container: HTMLElement,
  ): Promise<void> {
    if (output.kind !== "html") {
      throw new Error(
        "SafeContentFrameSandbox can only mount html ToolUI outputs",
      );
    }

    this._container = container;

    await this._renderHtml(output, container);
  }

  public async update(
    _instance: ToolUIInstance,
    output: ToolUIRenderOutput,
  ): Promise<void> {
    if (output.kind !== "html") {
      return;
    }

    if (!this._container) {
      return;
    }

    if (this._frame) {
      this._frame.dispose();
      this._frame = null;
      this._container.innerHTML = "";
    }

    await this._renderHtml(output, this._container);
  }

  public unmount(): void {
    if (this._frame) {
      this._frame.dispose();
      this._frame = null;
    }

    if (this._container) {
      this._container.innerHTML = "";
      this._container = null;
    }
  }

  private async _renderHtml(
    output: ToolUIHtmlOutput,
    container: HTMLElement,
  ): Promise<void> {
    const frame = await this._scf.renderHtml(output.html, container);

    if (output.height !== undefined) {
      frame.iframe.style.height = `${output.height}px`;
    }

    this._frame = frame;
  }
}
