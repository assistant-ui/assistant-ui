// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { startTransition, Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { aui, getProvider, resetProvider } = vi.hoisted(() => {
  type TestProvider = {
    getModelContext: () => {
      system?: string | undefined;
      tools?:
        | Record<string, { execute?: (() => unknown) | undefined }>
        | undefined;
    };
  };
  let provider: TestProvider | undefined;

  return {
    aui: {
      modelContext: {
        register: vi.fn((nextProvider: TestProvider) => {
          provider = nextProvider;
          return () => {
            if (provider === nextProvider) provider = undefined;
          };
        }),
      },
    },
    getProvider: () => provider,
    resetProvider: () => {
      provider = undefined;
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => aui,
}));

import { useAssistantContext } from "./useAssistantContext";
import { useAuiToolOverrides } from "./useAuiToolOverrides";

afterEach(() => {
  cleanup();
  resetProvider();
});

describe("model context hooks", () => {
  it("keeps assistant context scoped to the committed render", async () => {
    const pending = new Promise<never>(() => {});
    const Probe = ({ value, suspend }: { value: string; suspend: boolean }) => {
      useAssistantContext({ getContext: () => value });
      if (suspend) throw pending;
      return null;
    };

    const view = render(
      <Suspense fallback={null}>
        <Probe value="workspace-a" suspend={false} />
      </Suspense>,
    );
    await waitFor(() => expect(getProvider()).toBeDefined());

    act(() => {
      startTransition(() => {
        view.rerender(
          <Suspense fallback={null}>
            <Probe value="workspace-b" suspend />
          </Suspense>,
        );
      });
    });

    expect(getProvider()?.getModelContext().system).toBe("workspace-a");
  });

  it("keeps tool overrides scoped to the committed render", async () => {
    const pending = new Promise<never>(() => {});
    const Probe = ({ value, suspend }: { value: string; suspend: boolean }) => {
      useAuiToolOverrides({ search: { execute: () => value } });
      if (suspend) throw pending;
      return null;
    };

    const view = render(
      <Suspense fallback={null}>
        <Probe value="workspace-a" suspend={false} />
      </Suspense>,
    );
    await waitFor(() => expect(getProvider()).toBeDefined());

    act(() => {
      startTransition(() => {
        view.rerender(
          <Suspense fallback={null}>
            <Probe value="workspace-b" suspend />
          </Suspense>,
        );
      });
    });

    expect(getProvider()?.getModelContext().tools?.search?.execute?.()).toBe(
      "workspace-a",
    );
  });
});
