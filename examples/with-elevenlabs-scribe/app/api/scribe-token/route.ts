function isAllowedRequestContext(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = request.headers.get("origin");
  if (origin === null) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/**
 * Generate a single-use token for ElevenLabs Scribe v2 Realtime
 * @see https://elevenlabs.io/docs/cookbooks/speech-to-text/streaming
 */
export async function POST(request: Request) {
  if (!isAllowedRequestContext(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "ELEVENLABS_API_KEY must be set." },
      { status: 500 },
    );
  }

  const response = await fetch(
    "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      signal: request.signal,
    },
  );

  if (!response.ok) {
    const providerError = await response.text().catch(() => "");
    console.error(
      `ElevenLabs token request failed (${response.status}):`,
      providerError,
    );
    return Response.json(
      { error: "Unable to create a transcription session." },
      { status: 502 },
    );
  }

  const data: unknown = await response.json().catch(() => null);
  if (
    !data ||
    typeof data !== "object" ||
    !("token" in data) ||
    typeof data.token !== "string" ||
    !data.token.trim()
  ) {
    return Response.json(
      { error: "ElevenLabs returned an invalid token response." },
      { status: 502 },
    );
  }

  return Response.json(
    { token: data.token.trim() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
