// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTapRoot, useResource } from "@assistant-ui/tap";
import { AuiProvider, useAui, useAuiEvent } from "@assistant-ui/store";
import { ExternalThread } from "./external-thread";

let aui!: ReturnType<typeof useAui>;
const onModelContextUpdate = vi.fn();

const Capture: FC = () => {
  aui = useAui();
  useAuiEvent("thread.modelContextUpdate", onModelContextUpdate);
  return null;
};

const Harness: FC = () => {
  const client = useAui({ thread: ExternalThread({ messages: [] }) });
  return (
    <AuiProvider value={client}>
      <Capture />
    </AuiProvider>
  );
};

afterEach(() => {
  cleanup();
  onModelContextUpdate.mockClear();
});

describe("ExternalThread model context updates", () => {
  it("emits the active thread id when model context changes", async () => {
    render(<Harness />);

    let unregister!: () => void;
    act(() => {
      unregister = aui.modelContext.register({
        getModelContext: () => ({ config: { modelName: "late" } }),
      });
    });

    expect(aui.modelContext.getModelContext().config?.modelName).toBe("late");
    await waitFor(() => {
      expect(onModelContextUpdate).toHaveBeenCalledExactlyOnceWith({
        threadId: "default",
      });
    });

    act(() => unregister());
    await waitFor(() => {
      expect(onModelContextUpdate).toHaveBeenCalledTimes(2);
      expect(onModelContextUpdate).toHaveBeenNthCalledWith(2, {
        threadId: "default",
      });
    });
  });

  it("mounts without assistant store context", () => {
    const root = createTapRoot(function ExternalThreadRoot() {
      return useResource(ExternalThread({ messages: [] }));
    });

    root.unmount();
  });
});
