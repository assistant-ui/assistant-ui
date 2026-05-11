# `safe-content-frame`

[![npm version](https://img.shields.io/npm/v/safe-content-frame)](https://www.npmjs.com/package/safe-content-frame)
[![npm downloads](https://img.shields.io/npm/dm/safe-content-frame)](https://www.npmjs.com/package/safe-content-frame)
[![bundle size](https://img.shields.io/bundlephobia/minzip/safe-content-frame)](https://bundlephobia.com/package/safe-content-frame)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Render untrusted HTML, PDF, or arbitrary `Blob` content inside a sandboxed iframe whose origin is hashed per-content. The frame is hosted on `scf.auiusercontent.com`, a separate eTLD+1 from your app, so model-generated scripts cannot reach `document.cookie`, `localStorage`, or the parent window even if `allow-scripts` is set.

`safe-content-frame` is framework-agnostic vanilla JS. There is no React or DOM-framework dependency.

## Installation

```bash
npm install safe-content-frame
```

## Usage

```ts
import { SafeContentFrame } from "safe-content-frame";

const frame = new SafeContentFrame("my-app");

const container = document.getElementById("preview")!;
const rendered = await frame.renderHtml(modelGeneratedHtml, container);

await rendered.fullyLoadedPromiseWithTimeout(5000);

rendered.sendMessage({ type: "theme", value: "dark" });

// later
rendered.dispose();
```

The first argument to `SafeContentFrame` is your product identifier; it scopes the hashed origin so different products on the same domain do not collide.

## Methods

| Method                                                        | Purpose                                          |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `renderHtml(html, container, opts?)`                          | Render an HTML string.                           |
| `renderRaw(content, mimeType, container)`                     | Render any MIME type from a string or `Uint8Array`. |
| `renderPdf(content, container)`                               | Render a PDF document.                           |

Each renderer returns a `RenderedFrame`:

| Property/Method                      | Description                                                                |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `iframe`                             | The created `<iframe>` element.                                            |
| `origin`                             | The hashed origin the frame was loaded from.                               |
| `sendMessage(data, transfer?)`       | `postMessage` to the frame, scoped to its origin.                          |
| `fullyLoadedPromiseWithTimeout(ms)`  | Resolves once the frame signals it is fully loaded; rejects on timeout.    |
| `dispose()`                          | Remove the iframe from the DOM.                                            |

## Options

| Option                 | Default                                      | Effect                                                                                              |
| ---------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `useShadowDom`         | `false`                                      | Mount the iframe inside a closed shadow root.                                                       |
| `enableBrowserCaching` | `false`                                      | Derive the salt from the content hash so repeated renders reuse the same origin and HTTP cache.     |
| `sandbox`              | `["allow-same-origin", "allow-scripts"]`     | Extra `iframe[sandbox]` permissions to grant. The two defaults are always added.                    |
| `salt`                 | random per render                            | Override the salt explicitly (useful for tests or stable-origin embeds).                            |

## Sub-paths

- `safe-content-frame`: the main `SafeContentFrame` class above.
- `safe-content-frame/shadow_dom`: shadow-DOM rendering variant for embedding inside a custom element.

See the [docs page](https://www.assistant-ui.com/safe-content-frame) for the threat model and a live demo.
