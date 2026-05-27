import { describe, expect, it } from "vitest";
import { frontendTools } from "./frontendTools";
import { wrapModelContentEnvelope } from "./modelContentEnvelope";

describe("frontendTools", () => {
  it("forwards description and inputSchema for each tool", () => {
    const tools = frontendTools({
      getWeather: {
        description: "Get the weather",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
        },
      },
    });

    expect(tools.getWeather?.description).toBe("Get the weather");
    expect(tools.getWeather?.inputSchema).toBeDefined();
  });

  it("registers a toModelOutput that unwraps the modelContent envelope", async () => {
    const tools = frontendTools({
      readPdf: {
        parameters: { type: "object" },
      },
    });

    const envelope = wrapModelContentEnvelope(
      { mediaType: "application/pdf", base64: "JVBERi0xLjQK" },
      [
        { type: "text", text: "PDF contents:" },
        {
          type: "file",
          data: "JVBERi0xLjQK",
          mediaType: "application/pdf",
          filename: "doc.pdf",
        },
      ],
    );

    const output = await tools.readPdf!.toModelOutput!({
      toolCallId: "tc-1",
      input: {},
      output: envelope,
    });

    expect(output).toEqual({
      type: "content",
      value: [
        { type: "text", text: "PDF contents:" },
        {
          type: "file-data",
          mediaType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "doc.pdf",
        },
      ],
    });
  });

  it("emits image-data for image media types", async () => {
    const tools = frontendTools({
      screenshot: {
        parameters: { type: "object" },
      },
    });

    const envelope = wrapModelContentEnvelope(
      { mediaType: "image/png", base64: "iVBORw0KGgo=" },
      [
        {
          type: "file",
          data: "iVBORw0KGgo=",
          mediaType: "image/png",
        },
      ],
    );

    const output = await tools.screenshot!.toModelOutput!({
      toolCallId: "tc-1",
      input: {},
      output: envelope,
    });

    expect(output).toEqual({
      type: "content",
      value: [
        {
          type: "image-data",
          data: "iVBORw0KGgo=",
          mediaType: "image/png",
        },
      ],
    });
  });

  it("falls back to a JSON output for plain (non-envelope) results", async () => {
    const tools = frontendTools({
      getWeather: {
        parameters: { type: "object" },
      },
    });

    const output = await tools.getWeather!.toModelOutput!({
      toolCallId: "tc-1",
      input: {},
      output: { temp: 72 },
    });

    expect(output).toEqual({ type: "json", value: { temp: 72 } });
  });

  it("falls back to a text output for plain string results", async () => {
    const tools = frontendTools({
      echo: {
        parameters: { type: "object" },
      },
    });

    const output = await tools.echo!.toModelOutput!({
      toolCallId: "tc-1",
      input: {},
      output: "hello",
    });

    expect(output).toEqual({ type: "text", value: "hello" });
  });

  it("forwards providerOptions verbatim when present", () => {
    const tools = frontendTools({
      getWeather: {
        description: "Get the weather",
        parameters: { type: "object", properties: {} },
        providerOptions: { anthropic: { deferLoading: true } },
      },
    });

    expect(tools.getWeather?.providerOptions).toEqual({
      anthropic: { deferLoading: true },
    });
  });

  it("omits providerOptions when absent", () => {
    const tools = frontendTools({
      getWeather: {
        parameters: { type: "object", properties: {} },
      },
    });

    expect(tools.getWeather).not.toHaveProperty("providerOptions");
  });
});
