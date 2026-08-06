// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { useRuntimeAdapters } from "../RuntimeAdapterProvider";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

const mocks = vi.hoisted(() => ({
  aui: {
    threadListItem: {
      getState: () => ({ remoteId: "thread-1" }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  getClientId: (client: object) => client,
  useAui: () => mocks.aui,
}));

const makeCloud = () =>
  ({
    threads: {
      messages: {
        list: vi.fn().mockResolvedValue({ messages: [] }),
      },
    },
  }) as unknown as AssistantCloud;

const HistoryConsumer = () => {
  const history = useRuntimeAdapters()?.history;
  const historyKey = history?.key;

  useEffect(() => {
    if (history) void history.load();
  }, [history, historyKey]);

  return null;
};

const App = ({ cloud }: { cloud: AssistantCloud }) => {
  const adapter = useCloudThreadListAdapter({ cloud });
  const Provider = adapter.unstable_Provider!;

  return (
    <Provider>
      <HistoryConsumer />
    </Provider>
  );
};

describe("useCloudThreadListAdapter", () => {
  it("updates mounted history consumers when the Cloud client changes", async () => {
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    const { rerender } = render(<App cloud={firstCloud} />);

    await waitFor(() =>
      expect(firstCloud.threads.messages.list).toHaveBeenCalledOnce(),
    );

    rerender(<App cloud={secondCloud} />);

    await waitFor(() =>
      expect(secondCloud.threads.messages.list).toHaveBeenCalledOnce(),
    );
  });
});
