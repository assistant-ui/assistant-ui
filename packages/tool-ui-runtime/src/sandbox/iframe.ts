import type { ToolUISandbox, ToolUISandboxOptions } from "./types";

export type IframeSandboxOptions = ToolUISandboxOptions & {
  readonly sandbox?: string;
  readonly allow?: string;
};

export class IframeSandbox implements ToolUISandbox {
  public readonly type = "iframe" as const;
  public readonly options: Readonly<IframeSandboxOptions>;

  constructor(options: IframeSandboxOptions = {}) {
    this.options = options;
  }

  mount(): void {
    // TODO:
    // - create iframe
    // - apply sandbox / allow attributes from this.options
    // - attach postMessage bridge
  }

  update(): void {
    // TODO:
    // - cleanup iframe
    // - teardown bridge
  }

  destroy(): void {}
}
