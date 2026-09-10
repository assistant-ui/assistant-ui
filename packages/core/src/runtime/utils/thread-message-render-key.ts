import type { ThreadMessage } from "../../types/message";
import { generateId } from "../../utils/id";

const renderKeys = new WeakMap<object, string>();
const symbolThreadMessageRenderKey = Symbol("threadMessageRenderKey");

type ThreadMessageWithRenderKey = {
  readonly [symbolThreadMessageRenderKey]?: string;
};

const readExposedRenderKey = (message: object) =>
  (message as ThreadMessageWithRenderKey)[symbolThreadMessageRenderKey];

export const hasThreadMessageRenderKey = (message: ThreadMessage) =>
  readExposedRenderKey(message) !== undefined || renderKeys.has(message);

export const ensureThreadMessageRenderKey = (message: ThreadMessage) => {
  const existing = readExposedRenderKey(message) ?? renderKeys.get(message);
  if (existing !== undefined) return existing;

  const renderKey = `message-${generateId()}`;
  renderKeys.set(message, renderKey);
  return renderKey;
};

export const inheritThreadMessageRenderKey = (
  source: ThreadMessage,
  target: ThreadMessage,
) => {
  renderKeys.set(target, ensureThreadMessageRenderKey(source));
};

export const exposeThreadMessageRenderKey = (message: ThreadMessage) => ({
  [symbolThreadMessageRenderKey]: ensureThreadMessageRenderKey(message),
});

export const getThreadMessageRenderKey = <T extends { readonly id: string }>(
  message: T,
) => readExposedRenderKey(message) ?? renderKeys.get(message) ?? message.id;
