# `scf-websandbox`

A drop-in replacement for [`websandbox`](https://www.npmjs.com/package/websandbox) that runs untrusted JavaScript inside a [Safe Content Frame](https://www.assistant-ui.com/safe-content-frame) instead of a `srcdoc` iframe with a `null` origin.

The public API (`Websandbox.create`, `sandbox.promise`, `run`, `importScript`, `injectStyle`, `connection.remote`, `destroy`, and the in-frame `Websandbox.connection`) matches `websandbox`, so most code only needs a different import.

## Why

`websandbox` renders its frame with `sandbox="allow-scripts"` and no `allow-same-origin`, so the sandboxed document has an opaque `null` origin. Storage APIs throw, `fetch` sends `Origin: null`, and every message to the parent is posted with the `"*"` target origin.

`scf-websandbox` renders the same document through [`safe-content-frame`](https://www.npmjs.com/package/safe-content-frame). Each sandbox is served from its own hashed origin, `https://<hash>-h184756.scf.auiusercontent.com`, a subdomain of a Public Suffix List entry, so it is a separate site from your app and from every other sandbox:

- Sandboxed code gets a real origin: `localStorage`, `IndexedDB`, and CORS requests work, and are isolated per sandbox.
- It still cannot reach your app's DOM, cookies, or storage, because it is cross-site.
- The host only accepts the handshake from the sandbox's own window and origin. All RPC then runs over a private `MessageChannel`, never over `window.postMessage(..., "*")`.

## Installation

```bash
npm install scf-websandbox
```

## Usage

```ts
import Websandbox from "scf-websandbox";

const localApi = {
  log: (message: string) => console.log("from sandbox:", message),
};

const sandbox = Websandbox.create(localApi, {
  frameContainer: "#sandbox",
});

await sandbox.promise;

await sandbox.run(`
  Websandbox.connection.remote.log("hello");
  Websandbox.connection.setLocalApi({
    double: (n) => n * 2,
  });
`);

await sandbox.connection.remoteMethodsWaitPromise;
console.log(await sandbox.connection.remote.double(21)); // 42

sandbox.destroy();
```

## Migrating from `websandbox`

```diff
- import Websandbox from "websandbox";
+ import Websandbox from "scf-websandbox";
```

Then check the [differences](#differences-from-websandbox): `frameSrc` is not supported, and the iframe is created asynchronously.

The frame is served from `*.scf.auiusercontent.com`. If your app sets a Content Security Policy, allow it in `frame-src`:

```
frame-src https://*.scf.auiusercontent.com;
```

## API

### `Websandbox.create(localApi, options?)`

Creates a sandbox and returns it synchronously. `localApi` is an object of functions the sandboxed code can call as `Websandbox.connection.remote.<name>(...)`. It throws synchronously when the container cannot be found, when `frameContent` has no `<head>` tag, or when `frameSrc` is set.

### Sandbox

| Member | Description |
| --- | --- |
| `promise` | Resolves with the sandbox once the frame has connected and received `localApi`. Rejects when Safe Content Frame fails to load the frame. |
| `connection.remote` | The methods the frame exposed with `setLocalApi`. Each returns a promise. |
| `connection.localApi` | The host API passed to `create`. |
| `connection.setLocalApi(api)` | Replaces the API exposed to the frame. |
| `connection.remoteMethodsWaitPromise` | Resolves the first time the frame calls `setLocalApi`. |
| `run(codeOrFunction)` | Runs a code string as an inline `<script>`, or a function as `(fn)()`. A function is stringified, so it cannot close over host variables. |
| `importScript(url)` | Appends a `<script src>` and resolves when it loads. |
| `injectStyle(css)` | Appends a `<style>` element. |
| `destroy()` | Removes the iframe, closes the channel, and rejects pending calls. |
| `iframe` | The iframe element, or `null` until it is created. |
| `origin` | The sandbox's Safe Content Frame origin, or `null` until it is created. |

### Options

| Option | Default | Effect |
| --- | --- | --- |
| `frameContainer` | `"body"` | Selector or element the iframe is appended to. |
| `frameClassName` | `"websandbox__frame"` | Class of the iframe. |
| `frameContent` | Empty HTML document | The sandbox document; it must contain `<head>`. |
| `codeToRunBeforeInit` | `null` | Inline script placed first in `<head>`, before `Websandbox` exists. |
| `initialStyles` | `null` | CSS placed in a `<style>` in `<head>`. |
| `baseUrl` | `null` | Emitted as `<base href>`, so relative URLs in the document resolve against it. |
| `allowPointerLock` | `false` | Adds the `allow-pointer-lock` sandbox flag. |
| `allowFullScreen` | `false` | Grants the frame the `fullscreen` permission. |
| `sandboxAdditionalAttributes` | `""` | Space-separated extra `sandbox` flags. |
| `frameSrc` | `null` | Not supported; throws when set. |
| `product` | `"websandbox"` | Safe Content Frame product id, which scopes the hashed origin. |
| `safeContentFrame` | `{}` | Passed to `SafeContentFrame` (`useShadowDom`, `enableBrowserCaching`, `salt`). |
| `unsafeDocumentWrite` | `false` | Writes the document into the shim with `document.write` instead of navigating to a Blob URL, so `location` is an `https:` URL. |
| `loadTimeout` | `10000` | Milliseconds the Safe Content Frame shim may take to acknowledge the content before `promise` rejects. |

`BaseOptions` is exported with these defaults.

### Inside the frame

The frame gets a global `Websandbox` with the same shape as in `websandbox`:

```js
Websandbox.connection.remote.someHostMethod(arg).then(console.log);
Websandbox.connection.setLocalApi({ someFrameMethod() {} });
await Websandbox.connection.remoteMethodsWaitPromise;
```

## Differences from `websandbox`

- **`frameSrc` is not supported.** Safe Content Frame serves the frame document itself, so `Websandbox.create` throws when `frameSrc` is set. Pass your markup as `frameContent` instead; the runtime is injected into it.
- **The iframe is created asynchronously.** `websandbox` appends the iframe inside `create`. Here it exists once Safe Content Frame has computed the origin and loaded its shim, so `sandbox.iframe` is `null` until then. Calls made before the frame connects are queued and delivered once it does.
- **The sandbox has a real origin.** `allow-same-origin` is always set, because Safe Content Frame isolates the frame by serving it from a unique cross-site origin rather than by making the origin opaque. Code that relied on storage APIs throwing will see them work.
- **The iframe has Safe Content Frame's default styling** (`border: none; width: 100%; height: 100%`) instead of the browser's default size. Size the container, or style the iframe through `frameClassName`. With `safeContentFrame.useShadowDom`, the iframe sits in a closed shadow root and outside CSS does not reach it.
- **The document is a Blob URL by default.** `location.href` starts with `blob:https://...`. Relative URLs need `baseUrl`, and `document.cookie` is empty. Use `unsafeDocumentWrite: true` for an `https:` document URL.
- **Reloading or navigating the frame ends the sandbox.** The document is delivered once by the shim, so after `location.reload()` the frame does not reconnect. Create a new sandbox instead.
- **`allowFullScreen` and `allowPointerLock` work.** In `websandbox` both are no-ops: `allowFullScreen` sets a misspelled property, and `allowPointerLock` is never read.
- **`BaseOptions` is frozen.** `websandbox` merges your options into the shared `BaseOptions` object, so one sandbox's options leak into the next. Here every sandbox gets its own copy.
- **Errors reject with `Error` instances.** A thrown error crosses the boundary as its `name`, `message`, and own enumerable properties, and is rebuilt as an `Error` on the other side. `websandbox` rejects with a plain object of the same properties.
- **Failures settle calls instead of hanging them:**
  - A call to a method the other side did not expose rejects. `websandbox` throws inside its message handler and the call never settles.
  - A local API method that throws synchronously rejects the call.
  - `importScript` rejects when the script fails to load.
  - `destroy()` rejects pending calls, and calls made after it reject.
  - `promise` rejects when the Safe Content Frame shim fails to load. It stays pending when the sandbox is destroyed before it connects.
- **`run` accepts any function.** `websandbox` only stringifies functions with a `name`; here anonymous functions and arrow functions work too.
- **Non-cloneable results fall back to a JSON copy.** Both sides retry a response that fails structured cloning with its JSON form, as `websandbox` does for responses. A result that cannot be serialized either rejects the call.

## License

MIT
