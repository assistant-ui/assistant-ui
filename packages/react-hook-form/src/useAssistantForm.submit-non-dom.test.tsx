/** @vitest-environment jsdom */
import { act, cleanup, render } from "@testing-library/react";
import type { ModelContext } from "@assistant-ui/core";
import { Controller } from "react-hook-form";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  // react-hook-form captures `isWeb` at module load. A non-DOM renderer has no
  // window/document at all, so make that decision before importing it; the
  // jsdom globals are restored below so React can still render the fixture.
  vi.stubGlobal("window", undefined);
  vi.stubGlobal("document", undefined);
  vi.stubGlobal("HTMLElement", undefined);
  return { register: vi.fn(), setToolUI: vi.fn() };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    modelContext: { register: mocks.register },
    tools: { setToolUI: mocks.setToolUI },
  }),
}));

import { useAssistantForm } from "./useAssistantForm";

vi.unstubAllGlobals();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("submits through React Hook Form when DOM constructors are absent", async () => {
  let provider!: { getModelContext: () => ModelContext };
  mocks.register.mockImplementation((value) => {
    provider = value;
    return () => {};
  });
  let form!: ReturnType<typeof useAssistantForm<{ name: string }>>;
  const Form = () => {
    form = useAssistantForm({ defaultValues: { name: "Ada" } });
    return (
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => <input ref={field.ref} />}
      />
    );
  };
  render(<Form />);
  // A non-DOM renderer (React Native etc.) has no DOM constructors at all.
  vi.stubGlobal("HTMLElement", undefined);
  vi.stubGlobal("HTMLFormElement", undefined);

  const execute = provider.getModelContext().tools?.submit_form?.execute;
  if (!execute) throw new Error("submit_form is missing");
  await act(async () => {
    await expect(
      execute({}, { human: async () => true } as never),
    ).resolves.toEqual({ success: true });
  });
});
