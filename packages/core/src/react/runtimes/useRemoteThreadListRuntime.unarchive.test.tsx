// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PropsWithChildren } from "react";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import type { ThreadMessage } from "../../types/message";
import {
  actSettled,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useThreadListItemUnarchive } from "../primitive-hooks/useThreadListItemUnarchive";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

afterEach(cleanup);

const Provider = ({ children }: PropsWithChildren) => <>{children}</>;
const useThread = () =>
  useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    onNew: async () => {},
  });
const Restore = () => {
  const { disabled } = useThreadListItemUnarchive();
  return <button disabled={disabled}>Restore</button>;
};

describe("remote thread list unarchive support", () => {
  it.each([false, true])(
    "updates the runtime and control when the adapter changes (legacy provider: %s)",
    async (legacy) => {
      const supported = makeAdapter({
        list: async () => ({
          threads: [{ remoteId: "archived", status: "archived" }],
        }),
        ...(legacy ? { unstable_Provider: Provider } : {}),
      });
      const unsupported = { ...supported };
      delete unsupported.unarchive;
      let runtime!: AssistantRuntime;
      const App = ({ adapter }: { adapter: RemoteThreadListAdapter }) => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: useThread,
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <Restore />
          </AssistantRuntimeProvider>
        );
      };
      const { getByRole, rerender } = render(<App adapter={unsupported} />);
      const button = getByRole("button", {
        name: "Restore",
      }) as HTMLButtonElement;
      await waitFor(() =>
        expect(runtime.threads.getState().archivedThreadIds).toContain(
          "archived",
        ),
      );
      expect(button.disabled).toBe(true);
      expect(runtime.threads.getState().canUnarchive).toBe(false);

      await actSettled(() => runtime.threads.switchToThread("archived"));
      expect(runtime.threads.mainItem.getState().status).toBe("archived");

      rerender(<App adapter={supported} />);
      await waitFor(() => expect(button.disabled).toBe(false));
      expect(runtime.threads.getState().canUnarchive).toBe(true);
      rerender(<App adapter={unsupported} />);
      await waitFor(() => expect(button.disabled).toBe(true));
      expect(runtime.threads.getState().canUnarchive).toBe(false);
    },
  );
});
