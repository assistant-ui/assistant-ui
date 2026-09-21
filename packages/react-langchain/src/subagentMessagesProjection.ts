import type { BaseMessage } from "@langchain/core/messages";
import {
  messagesProjection,
  type ProjectionSpec,
} from "@langchain/langgraph-sdk/stream";

type MessagesProjection = ProjectionSpec<BaseMessage[]>;

type ProjectionThread = Parameters<MessagesProjection["open"]>[0]["thread"];

type ProjectionSubscription = Awaited<
  ReturnType<ProjectionThread["subscribe"]>
>;

const sameNamespace = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);

const scopeSubscription = (
  subscription: ProjectionSubscription,
  namespace: readonly string[],
): ProjectionSubscription =>
  new Proxy(subscription, {
    get(target, property) {
      if (property === Symbol.asyncIterator) {
        return async function* () {
          for await (const event of target) {
            if (sameNamespace(event.params.namespace, namespace)) yield event;
          }
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

const scopeThread = (
  thread: ProjectionThread,
  namespace: readonly string[],
): ProjectionThread =>
  new Proxy(thread, {
    get(target, property) {
      if (property === "subscribe") {
        return async (...args: Parameters<ProjectionThread["subscribe"]>) =>
          scopeSubscription(await target.subscribe(...args), namespace);
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

/**
 * The SDK's messages projection subscribes one level below its namespace and
 * applies every delivered event, so a nested subagent's `values` snapshots
 * rebuild its parent's store from the child's state while the child runs.
 * This projection admits only events at exactly the subagent's namespace,
 * the rule the SDK's root projection already applies.
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
        thread: scopeThread(thread, projection.namespace),
        store,
        rootBus,
      });
    },
  };
};
