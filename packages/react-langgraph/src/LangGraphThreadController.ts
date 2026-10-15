import {
  createLangGraphThreadState,
  reduceLangGraphThreadState,
  type LangGraphThreadAction,
} from "./langGraphThreadState";

export class LangGraphThreadController {
  private state = createLangGraphThreadState();
  private listeners = new Set<() => void>();

  public getState = () => this.state;
  public getToolResultBuffer = () => this.state.toolResultBuffer;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public dispatch = (action: LangGraphThreadAction) => {
    const previousBuffer = this.state.toolResultBuffer;
    this.state = reduceLangGraphThreadState(this.state, action);
    if (previousBuffer !== this.state.toolResultBuffer) {
      for (const listener of this.listeners) listener();
    }
    return this.state;
  };
}
