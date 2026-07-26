/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import type { ModelContext } from "@assistant-ui/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const register = vi.fn();
  const setToolUI = vi.fn();

  return {
    register,
    setToolUI,
    aui: {
      modelContext: () => ({ register }),
      tools: () => ({ setToolUI }),
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
}));

import { useAssistantForm } from "./useAssistantForm";

let provider: { getModelContext: () => ModelContext };

beforeEach(() => {
  mocks.register.mockReset();
  mocks.setToolUI.mockReset();
  mocks.register.mockImplementation((value) => {
    provider = value;
    return () => {};
  });
});

describe("useAssistantForm", () => {
  it("exposes current form values to the model context", () => {
    const { result } = renderHook(() =>
      useAssistantForm<{ name: string }>({
        defaultValues: { name: "" },
      }),
    );

    expect(provider.getModelContext().system).toBe('Form State:\n{"name":""}');

    act(() => {
      result.current.setValue("name", "Ada");
    });

    expect(provider.getModelContext().system).toBe(
      'Form State:\n{"name":"Ada"}',
    );
  });
});
