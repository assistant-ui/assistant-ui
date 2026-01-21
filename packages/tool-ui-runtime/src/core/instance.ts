import {
  ToolUILifecycleState,
  assertValidToolUILifecycleTransition,
} from "./lifecycle";

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
};

export type ToolUIInstance = {
  readonly id: string;
  getState(): ToolUIInstanceState;
  resolve(): void;
  markMounting(): void;
  markActive(): void;
  markUpdating(): void;
  close(): void;
  setResult(result: unknown): void;
};

export class ToolUIInstanceImpl implements ToolUIInstance {
  private _state: ToolUIInstanceState;

  public constructor(id: string, context: ToolUICallContext) {
    this._state = {
      id,
      context,
      lifecycle: "created",
    };
  }

  public get id(): string {
    return this._state.id;
  }

  public getState(): ToolUIInstanceState {
    return this._state;
  }

  protected transition(to: ToolUILifecycleState): void {
    assertValidToolUILifecycleTransition(this._state.lifecycle, to);

    this._state = {
      ...this._state,
      lifecycle: to,
    };
  }

  public resolve(): void {
    this.transition("resolved");
  }

  public markMounting(): void {
    this.transition("mounting");
  }

  public markActive(): void {
    this.transition("active");
  }

  public markUpdating(): void {
    this.transition("updating");
  }

  public close(): void {
    this.transition("closing");
    this.transition("closed");
  }

  public setResult(result: unknown): void {
    this._state = {
      ...this._state,
      result,
    };
  }
}
