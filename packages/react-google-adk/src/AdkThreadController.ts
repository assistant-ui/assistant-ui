import {
  createAdkThreadState,
  reduceAdkThreadState,
  type AdkThreadAction,
} from "./adkThreadState";
import type { AdkMessage } from "./types";

export class AdkThreadController {
  private state = createAdkThreadState();
  private readonly listeners = new Set<() => void>();

  public getState = () => this.state;

  public getStagedMessageCount = () => this.state.stagedEntries.size;

  public getStagedRun = (
    parentId: string | null,
    messages: AdkMessage[] = this.state.messages,
  ) => {
    const entries = this.state.stagedEntries;
    if (!parentId || !entries.has(parentId)) return null;

    const staged: AdkMessage[] = [];
    for (const message of messages) {
      if (message.id && entries.has(message.id)) {
        staged.push(entries.get(message.id)!.message);
      }
      if (message.id === parentId) break;
    }

    return { messages: staged, runConfig: entries.get(parentId)!.runConfig };
  };

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public dispatch = (action: AdkThreadAction) => {
    const nextState = reduceAdkThreadState(this.state, action);
    if (nextState === this.state) return;
    this.state = nextState;
    for (const listener of this.listeners) listener();
  };
}
