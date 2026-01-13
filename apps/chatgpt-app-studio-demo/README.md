# ChatGPT App Studio Demo

Read-only demo deployment of the ChatGPT App Studio workbench, embedded on the docs landing page.

## Purpose

This app is deployed to Vercel and embedded as an iframe on `assistant-ui.com/chatgpt-app-studio` to showcase the workbench functionality.

## URL Parameters

The demo supports URL parameters for configuration:

- `?component=poi-map` - Select which widget to display
- `?mode=inline|popup|fullscreen` - Set the display mode
- `?device=desktop|tablet|phone|resizable` - Set the viewport
- `?theme=light|dark` - Set the theme

## Development

```bash
pnpm install
pnpm dev
```

## Deployment

This app is automatically deployed via Vercel when changes are pushed to main.

The deployed URL should be set as `NEXT_PUBLIC_WORKBENCH_URL` in the docs app environment.
