import {
  createLangGraphThreadState,
  reduceLangGraphThreadState,
  type LangGraphThreadAction,
} from "./langGraphThreadState";

export class LangGraphThreadController {
  private state = createLangGraphThreadState();
  private listeners = new Set<() => void>();
  private stateListeners = new Set<() => void>();
  private queuedReplyIds: ReadonlySet<string> = new Set();

  public getState = () => this.state;
  public getQueuedReplyIds = () => this.queuedReplyIds;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public subscribeState = (listener: () => void) => {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  };

  public dispatch = (action: LangGraphThreadAction) => {
    const previous = this.state;
    this.state = reduceLangGraphThreadState(previous, action);
    if (this.state === previous) return this.state;
    if (
      previous.toolResultBuffer !== this.state.toolResultBuffer ||
      previous.pendingResume !== this.state.pendingResume
    ) {
      const queuedReplyIds = new Set([
        ...this.state.toolResultBuffer.keys(),
        ...[...this.state.pendingResume.values()].flatMap((entry) =>
          entry.messages.map((message) => message.tool_call_id),
        ),
      ]);
      if (
        queuedReplyIds.size !== this.queuedReplyIds.size ||
        [...queuedReplyIds].some((id) => !this.queuedReplyIds.has(id))
      ) {
        this.queuedReplyIds = queuedReplyIds;
        for (const listener of this.listeners) listener();
      }
    }
    for (const listener of this.stateListeners) listener();
    return this.state;
  };
}
