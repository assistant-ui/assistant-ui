# Threat model

## Parties and trust

| Party | Trusts | Does not trust |
| --- | --- | --- |
| **Host** (the page rendering `<RemoteComponent>`) | itself | remote code, remote messages, overlay content |
| **Remote** (an HTML document in the iframe, from a *publisher*, a model, or the host's own `html` prop) | its own publisher | the embedding page, other remotes |
| **Publisher origin** (where remotes are served) | — | — |
| **User** | the host they visited | — |

The remote is untrusted *code*. The host is untrusted *input* from the
remote's point of view (any page can frame a public remote URL).

## Assets

- Host page DOM, cookies, storage, credentials, and its users' data.
- The remote's own origin storage and cookies (when it has an origin).
- Data the host gives a remote (props), which the remote can send to the
  network by default (B7).
- The channel (anyone holding a port can speak the protocol).

## Boundaries and controls

### B1. Remote → host page
- Remote runs in an `<iframe sandbox>` on a **different origin** (ideally a
  different *site*). The same-origin policy prevents DOM, cookie and storage
  access to the host.
- `<RemoteComponent>` **refuses** a remote whose origin equals the host's
  origin when the sandbox includes `allow-same-origin` (that combination
  lets the frame remove its own sandbox). Override only with
  `dangerouslyAllowSameOrigin` (tests).
- Documents from the `html` prop are shown through `srcdoc`, which would
  inherit the host's origin with `allow-same-origin`, so the host always
  strips that token for them (opaque origin), or renders them through SCF
  (`isolation="scf"`, hashed origin).
- Default sandbox: `allow-scripts allow-same-origin allow-forms allow-popups
  allow-popups-to-escape-sandbox`. Notably absent: `allow-top-navigation*`
  (the remote cannot navigate the host), `allow-modals`, `allow-pointer-lock`,
  `allow-downloads`, `allow-storage-access-by-user-activation`.
- `allow=""` (Permissions Policy): no camera, microphone, geolocation, etc.
  unless the host opts in per instance.
- `referrerpolicy="strict-origin"`: the remote learns the host origin, not
  the full page URL.
- Overlays: the host renders them; a remote can only ask. Overlay content
  must come from an allowed origin (default: the requester's origin). An
  overlay cannot cover the host invisibly: it is a normal positioned element
  the host controls (z-index, backdrop, inert). Remaining risk:
  **clickjacking-style UI spoofing** inside overlays (a remote can draw a
  fake login form in a dialog). Mitigation for hosts that embed untrusted
  publishers: label overlays with the publisher's identity, or disable
  overlays (`overlayOrigins: []`).
- Resource abuse (CPU, memory, infinite layout growth): not prevented by
  the protocol. Chromium puts cross-site iframes in separate processes
  (site isolation), so a busy remote does not block the host's main thread.
  Hosts can cap size with CSS (`max-height` on the slot) and unmount.

### B2. Host page → remote
- The runtime validates every message structurally (validate.ts) and
  accepts the handshake only from `window.parent` with the nonce from its
  own URL fragment ("" for `srcdoc`/SCF documents, which see no fragment).
- Publishers restrict embedding with `Content-Security-Policy:
  frame-ancestors <allowed hosts>` (serving layer, middleware and Vite
  plugin: `frameAncestors: [...]`). The browser enforces it before the
  document loads, which a check inside the page could not. Without it, any
  page can frame the remote and call it with arbitrary props; remotes must
  treat props as untrusted input (like an API).
- The page sees the host only through `rc.props`, `rc.overlay()` and two
  payload-free events. Protocol messages never reach page code.
- Theme values are applied with `style.setProperty` (no rule injection).
  `@font-face` descriptors are sanitised: only `url("http(s)…")`,
  `url("data:font/…")` and `local("…")` sources; keyword-only descriptors.

### B3. The channel
- After the handshake all traffic uses a dedicated `MessagePort`. Other
  frames and extensions cannot inject into or read it; `window.postMessage`
  is used only for the `rc/initialize` request (no secrets) and its
  result.
- The result is posted with `targetOrigin` = the remote's exact origin, so
  if the frame was navigated elsewhere the port is not delivered.
- The host accepts `rc/initialize` only if `event.source ===
  iframe.contentWindow`, `event.origin` equals the expected origin, and
  the nonce matches. The runtime accepts the result only from
  `window.parent`, with its session as the JSON-RPC `id` and its nonce.
- Nonce: 128-bit random, in the URL **fragment** (never sent to servers,
  not in Referer or logs). It binds a handshake to a specific load attempt.
- **Opaque-origin mode** (sandbox without `allow-same-origin`, and every
  `srcdoc` document): `event.origin` is `"null"` and the result must use
  `targetOrigin "*"`. The source-window check and the nonce (when there
  is one) still apply, but if the sandboxed document navigates itself to
  another page between `rc/initialize` and its result, that page could
  receive the port. Residual risk; prefer own-origin mode or SCF.
- Every request has a response; unknown methods get `unsupported`; closing
  rejects pending calls. Messages that fail validation are dropped.

### B4. Function calls (RPC)
- Remote can call only functions the host passed as props, resolved by path
  against the **current** props (a function the host removed cannot be
  called: `stale-function`). Only paths listed in the encoding the host
  sent are served: functions inside a prop that failed to encode (a React
  element's `props.onClick`, its component `type`) or behind a
  non-enumerable property stay unreachable. The remote applies the same
  rule to the overlay props it sends.
- Arguments and return values are data only (functions rejected), so a
  remote cannot smuggle callable capabilities to the host and vice versa.
- Host callbacks must validate their arguments; they run with host
  privileges.

### B5. Data a host keeps for a remote
- There is no host state channel. A host that keeps data for a widget
  passes it in as a prop and takes changes through a callback prop; the
  callback validates and authorizes like any API (B4).
- With `isolation="scf"` and `scf.salt: "instance"`, each `instanceId`
  gets its own hashed origin, so its origin storage is separate from other
  instances of the same publisher. Instances that share an id share an
  origin and its storage by design.
- That storage is **host-trusted**. The host chooses which document SCF
  renders under an instance's origin, so it can render its own document
  with the same `instanceId` and read what the widget stored there
  (`localStorage`, IndexedDB, cookies). The host origin is part of the
  hash and browsers partition storage per top-level site, so a host can
  only reach storage created by widgets on its own site, never another
  host's.
- A publisher that must keep data from the host (its own tokens, say)
  runs in URL mode on its own origin, where the host cannot place
  documents. Signing documents with a publisher key that the SCF shim
  verifies before rendering would close this for SCF too; that is not
  built.

### B6. Cookies and credentials
- The remote's origin is separate, so host cookies are never sent to it and
  never readable by it. Remote requests carry the *remote* origin's cookies
  (third-party cookies: subject to browser 3PC policies; with partitioned
  storage / CHIPS they are partitioned per top-level site).
- Opaque-origin remotes have no cookies or storage at all; a host that
  wants to keep data for them passes it through props (B5).

### B7. Network (exfiltration)
- Default policy "public": a remote may `fetch`/connect to any `https:`
  or `wss:` endpoint (CSP `connect-src https: wss:`). **This means a remote
  can send its props anywhere on the public internet.** Version 1 required user approval for data plus network;
  version 2 trades that for remotes that just work with public APIs, the
  way a third-party script embed does. Give a remote only data you would
  give its publisher.
- No host credentials ever: the host relays nothing and attaches nothing.
  The remote's requests carry its own origin's cookies (third-party,
  partitioned) or none (opaque). Anything needing the user's authority is
  a host callback the host authorizes.
- The off switch: `network="none"` (or an allowlist) on the provider or a
  `<RemoteComponent>`. Enforced by the host's CSP `<meta>` for `html` and
  SCF documents; by `<iframe csp>` for URL remotes, which only Chromium
  enforces (CSP Embedded Enforcement; the serving layer sends
  `Allow-CSP-From: *`). On other engines a URL remote's network is what
  its own server sends: use the serving layer's `network` option, SCF, or
  the `html` prop for untrusted code there.
- Private networks: CSP cannot exclude address ranges, so `https:` also
  matches loopback, RFC 1918, link-local and cloud metadata addresses,
  and the host's own origin. Mitigations: no credentials are attached;
  Chromium's Private Network Access blocks public-origin and opaque
  frames from private addresses without a preflight the target must
  answer; plain `http:` is not allowed at all. Hosts on networks where
  that is not enough use "none" or an allowlist. A server-side proxy that
  enforces ranges is out of scope (the design has no relay).
- A page narrows its own network with
  `<meta http-equiv="Content-Security-Policy" content="connect-src …">`.
  The browser enforces every policy at once, so a page cannot widen the
  host's.

### B8. Host-rendered documents (`html` prop)
- The host normalizes the string (doctype, runtime, CSP `<meta>`) and
  shows it opaque. The content is untrusted like any remote.
- A `srcdoc` document inherits the host page's own CSP. A host whose CSP
  forbids inline scripts blocks the inlined runtime there (the remote
  fails with `load`); such hosts use `isolation="scf"`.

## Production deployment pattern (per-publisher origins)

Serve each publisher from its own origin on a dedicated domain that is on
the Public Suffix List, like Google's safe content frames
(`*.googleusercontent.com`):

    https://<hash(publisher-id)>.rc-usercontent.example/<component>/

- Different publishers get different **sites** (PSL entry), so they cannot
  share cookies or storage, and browsers isolate them in separate processes.
- The hash is a stable, opaque label: `base32(sha256(publisherId))[0:26]`.
- The host's own domain never serves remote code.
- Instances of one publisher share an origin, so they share a process and
  HTTP cache (performance), and their own storage.
- Send `frame-ancestors` per publisher (who may embed it) and a strict CSP
  for the remote documents (`default-src 'self'`; `connect-src` from the
  network policy, B7).
- Wildcard TLS certificate; no cookies set on the parent domain.

## Out of scope / not mitigated
- Side channels between same-process frames (Spectre) where site isolation
  is off (some mobile browsers). Using a separate *site* is the mitigation.
- A malicious host lying to a remote about props (a remote must not treat
  props as authenticated).
- Denial of service by a remote (busy loops, huge heights).
- Exfiltration of data the host chose to give a remote with network on
  (B7): the host decides by what it passes and by `network`.
- Phishing UI inside the remote's own area.
- A host reading what its own widgets stored in SCF instance storage (B5).
