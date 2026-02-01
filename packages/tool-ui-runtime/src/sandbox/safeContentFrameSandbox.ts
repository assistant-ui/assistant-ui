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

  private readonly _options: SafeContentFrameSandboxOptions;
  private _scf: SafeContentFrame;
  private _frame: RenderedFrame | null = null;
  private _container: HTMLElement | null = null;

  constructor(options: SafeContentFrameSandboxOptions = {}) {
    this._options = options;
    this._scf = this._createSCF();
  }

  private _createSCF(): SafeContentFrame {
    const scfOptions: any = {};

    if (this._options.sandbox !== undefined) {
      scfOptions.sandbox = this._options.sandbox;
    }

    if (this._options.useShadowDom !== undefined) {
      scfOptions.useShadowDom = this._options.useShadowDom;
    }

    if (this._options.enableBrowserCaching !== undefined) {
      scfOptions.enableBrowserCaching = this._options.enableBrowserCaching;
    }

    return new SafeContentFrame("tool-ui", scfOptions);
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

    try {
      await this._renderHtml(output, container);
    } catch (error) {
      this._container = null;
      container.innerHTML = "";

      throw new Error(
        `Failed to mount Tool UI Sandbox: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
      try {
        if (this._frame.iframe) {
          this._frame.iframe.onload = null;
        }
        this._frame.dispose();
      } catch (e) {
        console.warn("[SafeContentFrameSandbox] Error disposing old frame:", e);
      }
      this._frame = null;
    }

    this._container.innerHTML = "";
    this._scf = this._createSCF();

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

    frame.iframe.style.width = "100%";
    if (output.height !== undefined) {
      frame.iframe.style.height = `${output.height}px`;
    } else {
      frame.iframe.style.height = "150px";
    }

    this._frame = frame;
  }
}
