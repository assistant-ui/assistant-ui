import type { BaseMessage } from "@langchain/core/messages";
import {
  messagesProjection,
  type ProjectionSpec,
} from "@langchain/langgraph-sdk/stream";

type MessagesProjection = ProjectionSpec<BaseMessage[]>;

type ProjectionThread = Parameters<MessagesProjection["open"]>[0]["thread"];

const exactDepthThread = (thread: ProjectionThread): ProjectionThread =>
  new Proxy(thread, {
    get(target, property) {
      if (property === "subscribe") {
        return (...[params]: Parameters<ProjectionThread["subscribe"]>) =>
          target.subscribe({ ...params, depth: 0 });
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

/**
 * The SDK's messages projection subscribes at the protocol's default depth
 * of 1 and applies every delivered event, so a nested subagent's `values`
 * snapshots rebuild its parent's store from the child's state while the child
 * runs. The projection exposes no depth option, so this spec opens it against
 * a thread whose subscription is pinned to depth 0: the namespace the SDK
 * sets stays and only events at exactly that namespace are delivered, the
 * rule the SDK's root projection already applies. The client unions every
 * subscription's depth into the server filter, so a depth 0 subscription
 * narrows nothing for other consumers.
 */
export const subagentMessagesProjection = (
  namespace: readonly string[],
): MessagesProjection => {
  const projection = messagesProjection(namespace);
  return {
    key: `exact|${projection.key}`,
    namespace: projection.namespace,
    initial: projection.initial,
    open({ thread, store, rootBus }) {
      return projection.open({
        thread: exactDepthThread(thread),
        store,
        rootBus,
      });
    },
  };
};
