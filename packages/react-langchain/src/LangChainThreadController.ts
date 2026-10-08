import {
  createLangChainThreadState,
  reduceLangChainThreadState,
  type LangChainThreadAction,
} from "./langChainThreadState";

export class LangChainThreadController {
  private state = createLangChainThreadState();
  private listeners = new Set<() => void>();

  public getState = () => this.state;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public dispatch = (action: LangChainThreadAction) => {
    const nextState = reduceLangChainThreadState(this.state, action);
    if (nextState === this.state) return;
    this.state = nextState;
    for (const listener of this.listeners) listener();
  };
}
