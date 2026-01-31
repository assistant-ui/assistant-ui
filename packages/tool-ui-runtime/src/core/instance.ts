import type { ToolUILifecycleState } from "./lifecycle";
import { assertValidToolUILifecycleTransition } from "./lifecycle";

export type ToolUICallContext = {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: unknown;
};

export type ToolUIInstanceState = {
  readonly id: string;
  readonly context: ToolUICallContext;
  readonly lifecycle: ToolUILifecycleState;

  readonly result?: unknown;
  readonly output?: unknown;
};

export interface ToolUIInstance {
  readonly id: string;
  getState(): ToolUIInstanceState;

  resolve(): void;
  markMounting(): void;
  markActive(): void;
  markUpdating(): void;

  setResult(result: unknown): void;
  setOutput(output: unknown): void;

  close(): void;
}

export class ToolUIInstanceImpl implements ToolUIInstance {
  private _state: ToolUIInstanceState;
  public readonly id: string;

  constructor(id: string, context: ToolUICallContext) {
    this.id = id;
    this._state = {
      id,
      context,
      lifecycle: "created",
    };
  }

  public getState(): ToolUIInstanceState {
    return this._state;
  }

  private _transition(to: ToolUILifecycleState) {
    assertValidToolUILifecycleTransition(this._state.lifecycle, to);

    this._state = {
      ...this._state,
      lifecycle: to,
    };
  }

  public resolve(): void {
    this._transition("resolved");
  }

  public markMounting(): void {
    this._transition("mounting");
  }

  public markActive(): void {
    this._transition("active");
  }

  public markUpdating(): void {
    this._transition("updating");
  }

  public setResult(result: unknown): void {
    this._state = {
      ...this._state,
      result,
    };
  }

  public setOutput(output: unknown): void {
    this._state = {
      ...this._state,
      output,
    };
  }

  public close(): void {
    if (
      this._state.lifecycle === "closed" ||
      this._state.lifecycle === "closing"
    ) {
      return;
    }
    this._transition("closing");
    this._transition("closed");
  }
}
