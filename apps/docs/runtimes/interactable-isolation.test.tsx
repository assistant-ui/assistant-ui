// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  unstable_useInteractable,
  useAui,
  useLocalRuntime,
} from "@assistant-ui/react";
import { z } from "zod";
import { DocsRuntimeProvider } from "./docs";
import { InteractableRuntimeProvider } from "./interactable";

const docsToolkit = vi.hoisted(() =>
  Object.fromEntries(
    ["geocode_location", "get_weather", "remember", "set_theme"].map((name) => [
      name,
      {
        description: name,
        parameters: { type: "object", properties: {} },
        execute: async () => null,
      },
    ]),
  ),
);
const useDocsChatRuntime = vi.hoisted(() => vi.fn());
const useDocsCloud = vi.hoisted(() =>
  vi.fn(() => ({ cloud: undefined, claims: 0 })),
);
const useSpeechAdapters = vi.hoisted(() => vi.fn(() => ({})));

vi.mock("./chat-runtime", () => ({
  useDocsChatRuntime,
  useDocsCloud,
  useSpeechAdapters,
}));
vi.mock("@/lib/docs-toolkit", () => ({ default: docsToolkit }));

const chatModel = { run: async () => ({ content: [] }) };
const stateSchema = z.object({ value: z.string() });

function InteractableProbe() {
  unstable_useInteractable("taskBoard", {
    description: "A task board.",
    stateSchema,
    initialState: { value: "" },
  });
  return null;
}

function Capture({
  onClient,
}: {
  onClient: (client: ReturnType<typeof useAui>) => void;
}) {
  onClient(useAui());
  return null;
}

afterEach(cleanup);

it("isolates the nested providers' model-context tools", async () => {
  useDocsChatRuntime.mockImplementation(() => useLocalRuntime(chatModel));

  let docsClient!: ReturnType<typeof useAui>;
  let sampleClient!: ReturnType<typeof useAui>;
  render(
    <DocsRuntimeProvider devtools={false}>
      <Capture onClient={(client) => (docsClient = client)} />
      <InteractableRuntimeProvider>
        <Capture onClient={(client) => (sampleClient = client)} />
        <InteractableProbe />
      </InteractableRuntimeProvider>
    </DocsRuntimeProvider>,
  );

  await waitFor(() => {
    expect(
      Object.keys(sampleClient.thread.getModelContext().tools ?? {}),
    ).toEqual(["update_taskBoard"]);
    expect(
      Object.keys(docsClient.thread.getModelContext().tools ?? {}),
    ).toEqual(["geocode_location", "get_weather", "remember", "set_theme"]);
  });
});
