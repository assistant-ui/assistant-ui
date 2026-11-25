# Images

An image maker built from assistant-ui primitives and Elements: a gallery of templates, a message box with a model picker and the settings of a picture, an editor that opens beside the chat, and a sidebar of chats that starts closed.

Each chat is one picture and the changes asked of it. A new chat shows the gallery; the first request turns it into a thread, and each follow-up changes the newest picture.

## Files

| Concern | Where it lives |
|---|---|
| Runtime, thread, replies, message box | `components/images.tsx` |
| What each request sends, and the settings an editor change is made again with | `components/request.ts` |
| The sidebar and its list of chats, with Back and Forward and search, shared by the blocks | `../chat-sidebar.tsx` |
| Gallery tabs, template tiles and dialog, My images | `components/gallery.tsx` |
| Model picker | `components/models.tsx` |
| The editor panel, its tools, and how a change is sent | `components/editor.tsx` |
| What is drawn over a picture, and the PNG made from it | `components/canvas.tsx` |
| The plus menu and its settings | `components/settings.tsx` |
| The person at the foot of the sidebar, usage | `components/user.tsx` |
| The settings on offer, the choices made, and the pictures made | `components/state.tsx` |
| Icon, tooltip and menu parts | `components/ui.tsx` |
| The image route | `api/chat/route.ts` |
| The list of image models | `api/models/route.ts` |
| The model a visit starts on, and the templates | `data.json` |
| Theme | `block.css` |

## Elements

| Element | Where it is used |
|---|---|
| Image | One picture in a reply: preview, zoom, download, copy, make again, and the waiting and blocked states |
| Image gallery | Several pictures in a reply, and My images: a grid with one full-screen view |
| Model selector | The model picker in the message box |

## Run it

Copy `.env.example` to `.env.local` beside your app's `package.json`, set `OPENAI_API_KEY`, and set `BLOCKS_LIVE_API` to `true`. Without the flag the route answers 404, and without a key it answers 401.

Every picture costs money. Put your own sign-in and rate limit in front of the route before you deploy it.

## Models

`api/models/route.ts` reads the [Modelpedia API](https://modelpedia.dev/docs/api), which is free and needs no key. Modelpedia has no filter for what a model makes, so the route reads the whole list, keeps the models that make images, and holds the result for a day.

The picker lists all of them, grouped by provider. The image route holds a key for one provider, OpenAI, and calls its Images API, so only OpenAI's `gpt-image` models can be picked; OpenAI's chat models that make pictures are listed but cannot be picked, and the other providers are marked as needing their own key. To run another provider's models, add a call for it in `api/chat/route.ts` and widen `canRun` in `components/models.tsx`.

## How a picture is made

- A template is a prompt: using one writes its prompt in the message box, to send as it is or with your own details added.
- The model and the settings ride along as the message's run config, which the transport sends as the request's `metadata`.
- The transport sends only the newest request and the newest picture, so a long chat does not post every picture again.
- Making a picture again uses what the menu holds now, except for a change from the editor, which is made again with the settings it was sent with.
- The route calls OpenAI's Images API itself, because complexity and partial images are settings the AI SDK's image call does not send. Each picture comes back as a file part.
- A request in a chat that already holds a picture sends that picture as the starting point, along with any pictures attached to the request.

## Settings

| Setting | What the route sends |
|---|---|
| Orientation, Size | `size`. With no orientation the model picks both |
| Quality | `quality` |
| Complexity | `complexity`, left out on Auto |
| Images | `n`, up to 4 |
| Output | `output_format` |
| Background | `background`. Transparent needs WebP or PNG |
| Moderation | `moderation` |
| Partial images | `stream` and `partial_images`, for one picture at a time |

A partial picture arrives as a `data-partial` part and takes the place of the last one until the finished picture lands. The API streams only single pictures, and a model may finish before it sends any partial ones.

## Editor

"Edit" on a picture opens it in a panel on the right of the chat; on a phone the panel covers the chat. Each tool sends its change to the chat as a message, with the picture attached, and the picture that comes back takes its place in the panel.

| Tool | What is sent |
|---|---|
| Markup | The picture, and a PNG of what was drawn on it (pen, text, line, arrow, rectangle, ellipse) as `markup` |
| Comment | The same, with numbered pins as the drawing and their notes as the words |
| Erase | The picture, and a PNG that is clear where it was brushed as `mask` |
| Remove BG | The picture, with `background` set to transparent |
| Resize | The picture, with the `size` of the orientation picked |

The request's run config carries `edit` (`plain`, `markup` or `mask`), which tells the route to start from the attached picture and not the newest one in the chat. The model reads the words as a description of the finished picture, so an erase says what is left in the brushed area.

Marks are drawn as SVG in the picture's own pixels, whatever size it is shown at, and `rasterize` turns them into the PNG the model is sent.

## Template tiles

The tile pictures live in `public/blocks/images/<id>.webp`, one for each template. Each was made once with the template's `tile` prompt in `data.json`. To change one, make a new picture and save it under the same name.

## What is not kept

Chats, pictures and the usage count live in memory and are gone on reload.
