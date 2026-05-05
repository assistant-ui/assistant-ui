import type { ReactElement } from "react";
import { render } from "ink-testing-library";
import type { Mock } from "vitest";

export type UseAuiStateSelector = Parameters<
  typeof import("@assistant-ui/store")["useAuiState"]
>[0];

export const partContext = {
  index: null as number | null,
};

export const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

export const mockMessageState = (
  useAuiStateMock: Mock,
  state: { message: { parts: unknown[] } } & Record<string, unknown>,
) => {
  useAuiStateMock.mockImplementation((selector: UseAuiStateSelector) =>
    selector({
      ...state,
      get part() {
        if (partContext.index === null) return undefined;
        return state.message.parts[partContext.index];
      },
    } as never),
  );
};

export const mockPart = (useAuiStateMock: Mock, part: unknown) => {
  useAuiStateMock.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ part } as never),
  );
};

export const resetPartContext = () => {
  partContext.index = null;
};

export const PartByIndexProviderMock = ({
  index,
  children,
}: {
  index: number;
  children: ReactElement;
}) => {
  partContext.index = index;
  return children;
};
