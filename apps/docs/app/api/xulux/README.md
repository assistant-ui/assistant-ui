# Xulux Coding Agent API

Backend for the Xulux coding agent. Provisions Blaxel cloud sandboxes and scaffolds assistant-ui starter projects.

## Routes

- `POST /api/xulux/chat` - main chat route.
- `GET /api/xulux/examples` - Xulux examples/templates catalog derived from existing Fumadocs examples pages and `lib/examples.ts`.
- `POST /api/xulux/download` - exports the current sandbox workspace as `tar.gz`.
- Frontend page: `/playground` -> `AI Builder`.
- Temporary test page: `/xulux`.
- Internal preview page: `/playground/xulux-preview/[slug]`.

## Chat Request Body

```ts
{
  messages: UIMessage[];
  sessionId: string;
  selectedTemplate?: {
    id: string;
    title: string;
    description: string;
    kind: "template" | "example";
    prompt: string;
    sourcePath?: string;
    docsUrl?: string;
  } | null;
  tools?: Record<string, unknown>;
  system?: string;
  config?: { modelName?: string };
}
```

`selectedTemplate` is hidden context from the selected example/template. It does not create a visible user message.

## Agent Tools

| Tool | Side | Description |
|---|---|---|
| `provisionSandbox` | server | Creates a new Blaxel sandbox from `BL_SANDBOX_TEMPLATE`. Returns `{ status, workingDir, previewUrl }`. |
| `exec` | server | Runs shell commands in the sandbox. Use for reading/writing files, installing deps, and starting servers. |
| `refreshCanvas` | server | Fetches the public preview URL from Blaxel and returns `{ url }` to the client. |
| `listDocs` | server | Browse assistant-ui docs and examples structure, including `/examples`. |
| `readDoc` | server | Read a full docs or examples page by slug or URL. |
| `bash` | server | Run commands against the static monorepo source snapshot at `/repo`. |
| `readFile` | server | Read a file from the static monorepo source snapshot at `/repo`. |

## Sandbox Behavior

- Each page load generates a fresh `sessionId` with `crypto.randomUUID()`.
- `provisionSandbox` calls Blaxel `SandboxInstance.createIfNotExists`.
- Preview URLs are created with `sandbox.previews.createIfNotExists({ spec: { port: 3000, public: true } })`.
- Dev servers must bind to `0.0.0.0:3000`.
- The frontend switches to sandbox preview only when `refreshCanvas` returns `{ url }`.
- Selecting an example/template shows its hosted preview at `/playground/xulux-preview/[slug]` without auto-sending a chat message.

## Examples Catalog

`GET /api/xulux/examples` returns:

```ts
{
  categories: XuluxTemplateCategory[];
  templates: XuluxTemplate[];
}
```

Source of truth:

- Fumadocs examples loader: `apps/docs/lib/source.tsx`
- Existing examples card metadata: `apps/docs/lib/examples.ts`
- Catalog joiner: `apps/docs/lib/xulux/examples-catalog.ts`

Internal example previews use `/playground/xulux-preview/[slug]`. Examples with standalone embedded components render that component directly; examples without one render the existing screenshot fallback.

## Download

`POST /api/xulux/download` accepts:

```ts
{ sessionId: string }
```

It streams an `application/gzip` archive with `Content-Disposition: attachment`. The archive excludes dependencies, build output, caches, Git metadata, env files, and applies `/workspace/.gitignore` when present.

## Environment Variables

```env
BL_WORKSPACE=
BL_API_KEY=
BL_SANDBOX_TEMPLATE=
BL_REGION=
OPENAI_API_KEY=
```
