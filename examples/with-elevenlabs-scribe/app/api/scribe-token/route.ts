/**
 * Generate a single-use token for ElevenLabs Scribe v2 Realtime
 * @see https://elevenlabs.io/docs/cookbooks/speech-to-text/streaming
 */
export async function POST() {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env["ELEVENLABS_API_KEY"]!,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    return new Response(error, { status: response.status });
  }

  const data = await response.json();
  return Response.json({ token: data.token });
}
