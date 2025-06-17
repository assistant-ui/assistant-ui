"use client";

import { useCallback, useRef, useEffect } from "react";
import { ThreadHistoryAdapter } from "../adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../utils/MessageRepository";
import { ChatModelRunOptions, ChatModelRunResult } from "../local";

export class BufferedHistoryAdapter implements ThreadHistoryAdapter {
  private buffer: ExportedMessageRepositoryItem[] = [];
  private isInitialized = false;
  private initializePromise: Promise<void> | null = null;

  constructor(
    private baseAdapter: ThreadHistoryAdapter,
    private getInitializePromise: () => Promise<{ remoteId: string }>,
  ) {}

  async load() {
    return this.baseAdapter.load();
  }

  resume?(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void, unknown> {
    if (!this.baseAdapter.resume) {
      throw new Error("Base adapter does not support resume");
    }
    return this.baseAdapter.resume(options);
  }

  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    if (this.isInitialized) {
      return this.baseAdapter.append(item);
    }

    this.buffer.push(item);

    if (!this.initializePromise) {
      this.initializePromise = this.waitForInitialization();
    }

    await this.initializePromise;
    return this.baseAdapter.append(item);
  }

  private async waitForInitialization(): Promise<void> {
    try {
      await this.getInitializePromise();
      this.isInitialized = true;

      for (const bufferedItem of this.buffer) {
        await this.baseAdapter.append(bufferedItem);
      }
      this.buffer = [];
    } catch (error) {
      this.buffer = [];
      throw error;
    }
  }
}

export const useBufferedHistoryAdapter = (
  baseAdapter: ThreadHistoryAdapter | undefined,
  getInitializePromise: () => Promise<{ remoteId: string }>,
): ThreadHistoryAdapter | undefined => {
  const adapterRef = useRef<BufferedHistoryAdapter | null>(null);

  const adapter = useCallback(() => {
    if (!baseAdapter) return undefined;
    
    if (!adapterRef.current) {
      adapterRef.current = new BufferedHistoryAdapter(
        baseAdapter,
        getInitializePromise,
      );
    }
    
    return adapterRef.current;
  }, [baseAdapter, getInitializePromise]);

  useEffect(() => {
    adapterRef.current = null;
  }, [baseAdapter, getInitializePromise]);

  return adapter() as ThreadHistoryAdapter | undefined;
};
