import type { UIMessage } from "@ai-sdk/react";

const MAX_TITLE_GENERATION_ATTEMPTS = 3;

export class TitlePolicy {
  private newlyCreatedThreadIds = new Set<string>();
  private titleGenerated = new Set<string>();
  private titleGenerationInFlight = new Set<string>();
  private titleGenerationAttempts = new Map<string, number>();

  markNewThread(threadId: string): void {
    this.newlyCreatedThreadIds.add(threadId);
  }

  shouldGenerateTitle(threadId: string, messages: UIMessage[]): boolean {
    return (
      this.newlyCreatedThreadIds.has(threadId) &&
      !this.titleGenerated.has(threadId) &&
      !this.titleGenerationInFlight.has(threadId) &&
      messages.some((msg) => msg.role === "assistant")
    );
  }

  markTitleGenerationStarted(threadId: string): void {
    this.titleGenerationInFlight.add(threadId);
  }

  markTitleGenerated(threadId: string): void {
    this.titleGenerationInFlight.delete(threadId);
    this.titleGenerationAttempts.delete(threadId);
    this.titleGenerated.add(threadId);
    this.newlyCreatedThreadIds.delete(threadId);
  }

  // Every attempt runs a billed title-generation request, so a thread that
  // keeps failing gives up after a few tries instead of retrying on every
  // assistant completion for the rest of the session.
  markTitleGenerationFailed(threadId: string): void {
    this.titleGenerationInFlight.delete(threadId);
    const attempts = (this.titleGenerationAttempts.get(threadId) ?? 0) + 1;
    if (attempts >= MAX_TITLE_GENERATION_ATTEMPTS) {
      this.titleGenerationAttempts.delete(threadId);
      this.newlyCreatedThreadIds.delete(threadId);
    } else {
      this.titleGenerationAttempts.set(threadId, attempts);
    }
  }
}
