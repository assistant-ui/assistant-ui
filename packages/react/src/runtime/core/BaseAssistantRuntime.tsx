import type { AppendMessage } from "../../types/AssistantTypes";
import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { AssistantRuntime } from "./AssistantRuntime";
import { ThreadRuntime } from "./ThreadRuntime";

export abstract class BaseAssistantRuntime<TThreadRuntime extends ThreadRuntime>
  implements AssistantRuntime
{
  constructor(protected thread: TThreadRuntime) {}

  public abstract registerModelConfigProvider(
    provider: ModelConfigProvider,
  ): Unsubscribe;
  public abstract newThread(): void;
  public abstract switchToThread(threadId: string): void;

  public get messages() {
    return this.thread.messages;
  }

  public get isRunning() {
    return this.thread.isRunning;
  }

  public getBranches(messageId: string): readonly string[] {
    return this.thread.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    return this.thread.switchToBranch(branchId);
  }

  public append(message: AppendMessage): void {
    return this.thread.append(message);
  }

  public startRun(parentId: string | null): void {
    return this.thread.startRun(parentId);
  }

  public cancelRun(): void {
    return this.thread.cancelRun();
  }

  public addToolResult(toolCallId: string, result: any) {
    return this.thread.addToolResult(toolCallId, result);
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this.thread.subscribe(callback);
  }
}
