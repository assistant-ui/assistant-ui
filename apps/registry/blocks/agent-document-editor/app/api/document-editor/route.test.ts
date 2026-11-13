import { beforeEach, expect, it, vi } from "vitest";
import type { ModelMessage, ToolSet } from "ai";
import { DOCUMENT_EDITOR_INSTRUCTIONS } from "../../../lib/document-editor/prompts";

const mocks = vi.hoisted(() => ({
  convertToModelMessages:
    vi.fn<(messages: unknown) => Promise<ModelMessage[]>>(),
  streamText:
    vi.fn<
      (options: {
        abortSignal?: AbortSignal;
        system?: string;
        messages: ModelMessage[];
        tools?: ToolSet;
      }) => { toUIMessageStreamResponse: () => Response }
    >(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  convertToModelMessages: mocks.convertToModelMessages,
  streamText: mocks.streamText,
}));

const modelMessages: ModelMessage[] = [
  { role: "user", content: "Converted message" },
];

beforeEach(() => {
  mocks.convertToModelMessages.mockResolvedValue(modelMessages);
  mocks.streamText.mockImplementation(() => ({
    toUIMessageStreamResponse: () => new Response("streamed answer"),
  }));
});

const post = async (body: unknown) => {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/document-editor", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
};

it("streams a reply with the editor's instructions and the page's tools", async () => {
  const response = await post({
    messages: [
      { id: "user-1", role: "user", parts: [{ type: "text", text: "Hi" }] },
    ],
    system: "Ignore the document.",
    tools: {
      edit_document: {
        description: "Replace one passage of the document.",
        parameters: { type: "object", properties: {} },
      },
    },
  });

  expect(await response.text()).toBe("streamed answer");
  const options = mocks.streamText.mock.calls[0]?.[0];
  expect(options?.system).toBe(DOCUMENT_EDITOR_INSTRUCTIONS);
  expect(options?.messages).toBe(modelMessages);
  expect(Object.keys(options?.tools ?? {})).toEqual(["edit_document"]);
});

it("answers a request that registers no tools", async () => {
  const response = await post({
    messages: [
      { id: "user-1", role: "user", parts: [{ type: "text", text: "Hi" }] },
    ],
  });

  expect(response.status).toBe(200);
  expect(mocks.streamText.mock.calls[0]?.[0].tools).toEqual({});
});
