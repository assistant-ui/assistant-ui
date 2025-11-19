"use client";

import {
  useAssistantClient,
  AssistantProvider,
  useAssistantState,
} from "@assistant-ui/store";
import { FooList, FooListResource } from "./store/foo-store";
import "./store/foo-scope"; // Register the fooList scope (demonstrates scope registry)

/**
 * Single Foo component - displays and allows editing a single foo
 */
const Foo = () => {
  const aui = useAssistantClient();
  const fooState = useAssistantState(({ foo }) => {
    console.log("selector called with state", foo);
    return foo;
  });

  const handleUpdate = () => {
    aui.foo().updateBar(`Updated at ${new Date().toLocaleTimeString()}`);
    console.log("Foo state", aui.foo().getState(), fooState);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            ID:
          </span>
          <span className="font-mono text-sm text-gray-900 dark:text-white">
            {fooState.id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Value:
          </span>
          <span className="text-gray-900 dark:text-white">{fooState.bar}</span>
        </div>
        <button
          onClick={handleUpdate}
          className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800"
        >
          Update Value
        </button>
      </div>
    </div>
  );
};

const FooListLength = () => {
  const fooListLength = useAssistantState(({ fooList }) => fooList.foos.length);
  return (
    <span className="text-gray-500 dark:text-gray-400">
      ({fooListLength} items)
    </span>
  );
};

/**
 * Example App - demonstrates the store with styled components
 *
 * Note: The fooList scope is also registered in foo-scope.ts as a default,
 * but we're explicitly passing it here for clarity in the example.
 */
export const ExampleApp = () => {
  const rootClient = useAssistantClient({
    fooList: FooListResource(),
  });

  return (
    <AssistantProvider client={rootClient}>
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Foo List <FooListLength />
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Each item is rendered in its own FooProvider with scoped access
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FooList components={{ Foo }} />
        </div>
      </div>
    </AssistantProvider>
  );
};
