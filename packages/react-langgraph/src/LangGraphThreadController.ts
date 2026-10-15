import {
  createLangGraphThreadState,
  reduceLangGraphThreadState,
  type LangGraphThreadAction,
} from "./langGraphThreadState";

export class LangGraphThreadController {
  private state = createLangGraphThreadState();
  private listeners = new Set<() => void>();
  private queuedReplyIds: ReadonlySet<string> = new Set();

  public getState = () => this.state;
  public getQueuedReplyIds = () => this.queuedReplyIds;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public dispatch = (action: LangGraphThreadAction) => {
    const previousBuffer = this.state.toolResultBuffer;
    const previousPendingResume = this.state.pendingResume;
    this.state = reduceLangGraphThreadState(this.state, action);
    if (
      previousBuffer !== this.state.toolResultBuffer ||
      previousPendingResume !== this.state.pendingResume
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
    return this.state;
  };
}
