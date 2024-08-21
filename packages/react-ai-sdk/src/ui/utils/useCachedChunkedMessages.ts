import { Message } from "ai";
import { useMemo } from "react";

type Chunk = [Message, ...Message[]];
const hasItems = (messages: Message[]): messages is Chunk =>
  messages.length > 0;

const chunkedMessages = (messages: Message[]): Chunk[] => {
  const chunks: Chunk[] = [];
  let currentChunk: Message[] = [];

  for (const message of messages) {
    if (message.role === "assistant" || message.role === "data") {
      currentChunk.push(message);
    } else {
      if (hasItems(currentChunk)) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
      chunks.push([message]);
    }
  }

  if (hasItems(currentChunk)) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const shallowArrayEqual = (a: unknown[], b: unknown[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const useCachedChunkedMessages = (messages: Message[]) => {
  const cache = useMemo(() => new WeakMap<Message, Message[]>(), []);

  return useMemo(() => {
    return chunkedMessages(messages).map((m) => {
      const key = m[0];
      if (!key) return m;

      const cached = cache.get(key);
      if (cached && shallowArrayEqual(cached, m)) return cached;
      cache.set(key, m);
      return m;
    });
  }, [messages, cache]);
};
