"use client";

import { useState } from "react";
import {
  useAui,
  AuiProvider,
  useAuiState,
  useAuiEvent,
} from "@assistant-ui/store";
import { FooList, FooListResource } from "./store/foo-store";

/**
 * Single Foo component - displays and allows editing a single foo
 */
const Foo = () => {
  const aui = useAui();
  const fooId = useAuiState((s) => s.foo.id);
  const fooBar = useAuiState((s) => s.foo.bar);

  // Each foo logs its own events - only receives events from THIS foo instance
  useAuiEvent("foo.updated", (payload) => {
    console.log(`[${fooId}] Updated to: ${payload.newValue}`);
  });

  const handleUpdate = () => {
    aui.foo().updateBar(`Updated at ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500 text-sm dark:text-gray-400">
            ID:
          </span>
          <span className="font-mono text-gray-900 text-sm dark:text-white">
            {fooId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500 text-sm dark:text-gray-400">
            Value:
          </span>
          <span className="text-gray-900 dark:text-white">{fooBar}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleUpdate}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Update
          </button>
          <button
            onClick={() => aui.foo().remove()}
            className="rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const FooListLength = () => {
  const fooListLength = useAuiState((s) => s.fooList.foos.length);
  return (
    <span className="text-gray-500 dark:text-gray-400">
      ({fooListLength} items)
    </span>
  );
};

const AddFooButton = () => {
  const aui = useAui();
  return (
    <button
      onClick={() => aui.fooList().addFoo()}
      className="rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
    >
      Add New
    </button>
  );
};

type EventLogEntry = {
  id: number;
  event: string;
  payload: unknown;
  timestamp: Date;
};

let idCounter = 0;
/**
 * EventLog component - demonstrates event subscription
 */
const EventLog = () => {
  const [logs, setLogs] = useState<EventLogEntry[]>([]);

  // Subscribe to all events using the wildcard selector
  useAuiEvent("*", (data) => {
    setLogs((prev) => [
      {
        id: ++idCounter,
        event: data.event,
        payload: data.payload,
        timestamp: new Date(),
      },
      ...prev.slice(0, 9), // Keep last 10 entries
    ]);
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
        Event Log
      </h3>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm dark:text-gray-400">
            No events yet. Try updating or deleting a foo.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded border border-gray-100 bg-gray-50 p-2 font-mono text-xs dark:border-gray-600 dark:bg-gray-700"
            >
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {log.event}
              </span>
              <span className="ml-2 text-gray-600 dark:text-gray-300">
                {JSON.stringify(log.payload)}
              </span>
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                {log.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Example App - demonstrates the store with styled components
 *
 * Note: The fooList scope is also registered in foo-scope.ts as a default,
 * but we're explicitly passing it here for clarity in the example.
 */
export const ExampleApp = () => {
  const aui = useAui({
    fooList: FooListResource({ initialValues: true }),
  });

  return (
    <AuiProvider value={aui}>
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-xl dark:text-white">
              Foo List <FooListLength />
            </h2>
            <AddFooButton />
          </div>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
            Each item is rendered in its own FooProvider with scoped access
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FooList components={{ Foo }} />
        </div>
        <EventLog />
      </div>
    </AuiProvider>
  );
};
