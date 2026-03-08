import { AuixPrism } from "@aui-x/prism";

const apiKey = process.env["AUIX_PRISM_API_KEY"];
const baseUrl = process.env["AUIX_PRISM_BASE_URL"];

export function createPrismTracer(): AuixPrism | null {
  if (!apiKey) return null;
  return new AuixPrism({
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
    project: "assistant-ui-docs",
  });
}
