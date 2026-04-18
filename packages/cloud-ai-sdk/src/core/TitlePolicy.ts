import type { UIMessage } from "@ai-sdk/react";

export class TitlePolicy {
  private newlyCreatedThreadIds = new Set<string>();
  private titleGenerated = new Set<string>();

  markNewThread(threadId: string): void {
    this.newlyCreatedThreadIds.add(threadId);
  }

  shouldGenerateTitle(threadId: string, messages: UIMessage[]): boolean {
    return (
      this.newlyCreatedThreadIds.has(threadId) &&
      !this.titleGenerated.has(threadId) &&
      messages.some((msg) => msg.role === "assistant")
    );
  }

  markTitleGenerated(threadId: string): void {
    this.titleGenerated.add(threadId);
    this.newlyCreatedThreadIds.delete(threadId);
  }
}
