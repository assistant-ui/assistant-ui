import { afterEach, describe, expect, it, vi } from "vitest";
import { Text } from "ink";
import { cleanup } from "ink-testing-library";
import { renderFrame } from "../../tests/helpers";
import { ThreadListItemUnarchive } from "./ThreadListItemUnarchive";

const hooks = vi.hoisted(() => ({
  supported: true,
  unarchive: vi.fn<() => void>(),
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useThreadListItemUnarchive: () => ({
    unarchive: hooks.unarchive,
    disabled: !hooks.supported,
  }),
}));

afterEach(cleanup);

describe("ThreadListItemUnarchive", () => {
  it.each([true, false])(
    "exposes disabled state to terminal renderers when support is %s",
    async (supported) => {
      hooks.supported = supported;
      const frame = await renderFrame(
        <ThreadListItemUnarchive disabled={false}>
          {({ disabled }) => (
            <Text>
              {disabled ? "Restore unavailable" : "Restore available"}
            </Text>
          )}
        </ThreadListItemUnarchive>,
      );
      expect(frame).toContain(
        supported ? "Restore available" : "Restore unavailable",
      );
    },
  );
});
