# ElevenLabs Scribe Integration

This example demonstrates how to add voice-to-text dictation using ElevenLabs Scribe with assistant-ui.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-elevenlabs-scribe
cd my-app
```

### Environment Variables

Create `.env.local`:

```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk-...
```

### Run

```bash
npm run dev
```

The token endpoint rejects browser requests marked same-site or cross-site so the example can create short-lived Scribe sessions without exposing `ELEVENLABS_API_KEY`. For clients without Fetch Metadata, reverse proxies must preserve the public scheme and host in the request URL for the `Origin` fallback. Request-context checks are not user authentication. Before deploying, require your application session in `app/api/scribe-token/route.ts` and apply a durable rate limit.

## Features

- ElevenLabs Scribe voice-to-text integration
- Custom dictation adapter
- Real-time voice transcription
- Vercel AI SDK integration

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [ElevenLabs Scribe](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)
