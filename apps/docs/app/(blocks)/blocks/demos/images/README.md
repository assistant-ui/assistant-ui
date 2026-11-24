# Images

An image maker built from assistant-ui primitives: a gallery of templates, a message box that sets the shape and the detail, and a sidebar of the pictures you have made.

Each chat is one picture and the changes asked of it. A new chat shows the gallery; the first request turns it into a thread, and each follow-up changes the newest picture.

## Files

| Concern | Where it lives |
|---|---|
| Runtime, thread, message box | `components/images.tsx` |
| The sidebar and its list of chats, shared by the blocks | `../chat-sidebar.tsx` |
| Gallery tabs, template tiles and dialog, My images | `components/gallery.tsx` |
| The person at the foot of the sidebar, usage | `components/user.tsx` |
| Choices for the next picture, and the pictures made | `components/state.tsx` |
| Icon, tooltip and menu parts | `components/ui.tsx` |
| The image route | `api/chat/route.ts` |
| Model name, templates and trending prompts | `data.json` |
| Theme | `block.css` |

## Run it

Copy `.env.example` to `.env.local` beside your app's `package.json`, set `OPENAI_API_KEY`, and set `BLOCKS_LIVE_API` to `true`. Without the flag the route answers 404, and without a key it answers 401.

Every picture costs money. Put your own sign-in and rate limit in front of the route before you deploy it.

## How a picture is made

- A template is a prompt: using one writes its prompt in the message box, to send as it is or with your own details added.
- The message box sets the aspect ratio and the detail as the message's run config, which the transport sends as the request's `metadata`.
- The transport sends only the newest request and the newest picture, so a long chat does not post every picture again.
- The route calls the image model and streams the picture back as one file part.
- A request in a chat that already holds a picture sends that picture as the starting point, along with any pictures attached to the request.

## Template tiles

The tile pictures live in `public/blocks/images/<id>.webp`, one for each template. Each was made once with the template's `tile` prompt in `data.json`. To change one, make a new picture and save it under the same name.

## What is not kept

Chats, pictures and the usage count live in memory and are gone on reload.
