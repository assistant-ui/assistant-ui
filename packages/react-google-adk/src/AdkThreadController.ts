import {
  createAdkThreadState,
  reduceAdkThreadState,
  type AdkThreadAction,
} from "./adkThreadState";

export class AdkThreadController {
  private state = createAdkThreadState();
  private readonly listeners = new Set<() => void>();

  public getState = () => this.state;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public dispatch = (action: AdkThreadAction) => {
    this.state = reduceAdkThreadState(this.state, action);
    for (const listener of this.listeners) listener();
  };
}
