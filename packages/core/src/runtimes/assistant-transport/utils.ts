export async function createRequestHeaders(
  headersValue:
    | Record<string, string>
    | Headers
    | (() => Promise<Record<string, string> | Headers>),
): Promise<Headers> {
  const resolvedHeaders =
    typeof headersValue === "function" ? await headersValue() : headersValue;

  const headers = new Headers(resolvedHeaders);
  headers.set("Content-Type", "application/json");
  return headers;
}
