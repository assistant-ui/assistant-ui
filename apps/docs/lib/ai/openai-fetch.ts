export const fetchOpenAI: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (
    !response.ok ||
    !url.pathname.endsWith("/chat/completions") ||
    response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase() !== "application/json"
  )
    return response;

  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  if (
    body === null ||
    typeof body !== "object" ||
    !("success" in body) ||
    body.success !== true ||
    "choices" in body ||
    !("data" in body) ||
    body.data === null ||
    typeof body.data !== "object" ||
    !("choices" in body.data)
  )
    return response;

  // The billing gateway envelopes non-streaming completions; the SDK still validates data.
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(JSON.stringify(body.data), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
