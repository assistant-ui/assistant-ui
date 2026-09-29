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

The token endpoint keeps `ELEVENLABS_API_KEY` server-side and accepts a request only when `Sec-Fetch-Site` is `same-origin` or `none`, so a `same-site` request from another subdomain is rejected as well. For clients that omit Fetch Metadata it falls back to comparing the `Origin` header against the request URL, which behind a reverse proxy needs the public scheme and host preserved there.

A request-context check is not authentication. Before deploying, require your application session in `app/api/scribe-token/route.ts` and apply a durable rate limit.

## Features

- ElevenLabs Scribe voice-to-text integration
- Custom dictation adapter
- Real-time voice transcription
- Vercel AI SDK integration

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [ElevenLabs Scribe](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)
