export function formatMCPResponse(data: any): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
} {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const isStructured =
    typeof data === "object" && data !== null && !Array.isArray(data);
  return {
    content: [{ type: "text", text }],
    ...(isStructured && {
      structuredContent: data as Record<string, unknown>,
    }),
  };
}
