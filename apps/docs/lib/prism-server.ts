import { AuixPrism } from "@aui-x/prism";

const apiKey = process.env["AUIX_PRISM_API_KEY"];

export function createPrismTracer(): AuixPrism | null {
  if (!apiKey) return null;
  return new AuixPrism({
    apiKey,
    project: "assistant-ui-docs",
  });
}
