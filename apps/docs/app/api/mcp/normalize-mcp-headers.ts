// The public docs endpoint keeps accepting pre-SDK lenient clients that omit the SSE half of Accept or the Content-Type header.
// The substring checks deliberately mirror the SDK gate's own matching; do not tighten them independently of the gate.
export async function normalizeMcpRequestHeaders(
  request: Request,
): Promise<Request> {
  const accept = request.headers.get("accept");
  const needsAcceptFix =
    !accept?.includes("application/json") ||
    !accept.includes("text/event-stream");
  const needsContentTypeFix = request.headers.get("content-type") === null;
  if (!needsAcceptFix && !needsContentTypeFix) return request;

  const headers = new Headers(request.headers);
  if (needsAcceptFix) {
    headers.set("Accept", "application/json, text/event-stream");
  }
  if (needsContentTypeFix) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(request.url, {
    method: request.method,
    headers,
    body: await request.text(),
  });
}
