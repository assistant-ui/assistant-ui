import { createXuluxSuggestionReplayResponse } from "./xulux-suggestion-replay";

export function createXuluxChatFetch(
  networkFetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis),
): typeof globalThis.fetch {
  return async (input, init) => {
    const suggestionId = getXuluxSuggestionId(init?.body);
    if (suggestionId) {
      const replay = createXuluxSuggestionReplayResponse(suggestionId);
      if (replay) return replay;
    }

    return networkFetch(input, init);
  };
}

export function getXuluxSuggestionId(body: BodyInit | null | undefined) {
  if (typeof body !== "string") return null;

  try {
    const parsed = JSON.parse(body) as {
      metadata?: { custom?: { xuluxSuggestionId?: unknown } };
    };
    const suggestionId = parsed.metadata?.custom?.xuluxSuggestionId;
    return typeof suggestionId === "string" && suggestionId.length > 0
      ? suggestionId
      : null;
  } catch {
    return null;
  }
}
