import { anonymousSessionFetch } from "./anonymous-session-client";
import {
  RATE_LIMIT_REASON_HEADER,
  RATE_LIMIT_REASONS,
} from "./rate-limit-reason";

type PlaygroundChatFetchOptions = {
  isSignedIn: () => boolean;
  onAnonymousLimit: () => void;
  anonymousFetch?: typeof fetch;
  authenticatedFetch?: typeof fetch;
};

export function createPlaygroundChatFetch({
  isSignedIn,
  onAnonymousLimit,
  anonymousFetch = anonymousSessionFetch,
  authenticatedFetch = fetch,
}: PlaygroundChatFetchOptions): typeof fetch {
  return async (input, init) => {
    const wasSignedIn = isSignedIn();
    const response = await (wasSignedIn ? authenticatedFetch : anonymousFetch)(
      input,
      init,
    );

    if (
      !wasSignedIn &&
      response.status === 429 &&
      response.headers.get(RATE_LIMIT_REASON_HEADER) ===
        RATE_LIMIT_REASONS.identityDaily
    ) {
      onAnonymousLimit();
    }

    return response;
  };
}
