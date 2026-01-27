# PostMessageTransport

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

JSON-RPC transport using `window.postMessage` for iframe↔parent communication.

This transport enables bidirectional communication between MCP Apps running in
iframes and their host applications using the browser's `postMessage` API. It
implements the MCP SDK's `Transport` interface.

## Security[](#security)

The `eventSource` parameter is required and validates the message source window
by checking `event.source`. For views, pass `window.parent`.
For hosts, pass `iframe.contentWindow` to validate the iframe source.

## Usage[](#usage)

**View**:

```
`const transport = new PostMessageTransport(window.parent, window.parent);
await app.connect(transport);
`Copy
```

**Host**:

```
`const iframe = document.getElementById("app-iframe") as HTMLIFrameElement;
const transport = new PostMessageTransport(
  iframe.contentWindow!,
  iframe.contentWindow!,
);
await bridge.connect(transport);
`Copy
```

#### See[](#see)

- [`App.connect`](app.App.html#connect) for View usage

- [`AppBridge.connect`](app-bridge.AppBridge.html#connect) for Host usage

#### Implements

- Transport

##### Index

### Constructors

[constructor](#constructor)

### constructor[](#constructor)

- new PostMessageTransport(
    eventTarget?: Window,
    eventSource: MessageEventSource,
): [PostMessageTransport]()[](#constructorpostmessagetransport)
Create a new PostMessageTransport.

#### Parameters

eventTarget: Window = window.parentTarget window to send messages to (default: `window.parent`)

- eventSource: MessageEventSourceSource window for message validation. For views, pass
`window.parent`. For hosts, pass `iframe.contentWindow`.

#### Returns [PostMessageTransport]()

#### Example: View connecting to parent[](#example-view-connecting-to-parent)

```
`const transport = new PostMessageTransport(window.parent, window.parent);
`Copy
```

#### Example: Host connecting to iframe[](#example-host-connecting-to-iframe)

```
`const iframe = document.getElementById("app-iframe") as HTMLIFrameElement;
const transport = new PostMessageTransport(
  iframe.contentWindow!,
  iframe.contentWindow!,
);
`Copy
```

- Defined in [src/message-transport.ts:72](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L72)

### `Optional`onclose[](#onclose)

onclose?: () => void
Called when the transport is closed.

Set this handler to be notified when [`close`](#close) is called.

Implementation of Transport.onclose

- Defined in [src/message-transport.ts:135](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L135)

### `Optional`onerror[](#onerror)

onerror?: (error: Error) => void
Called when a message parsing error occurs.

This handler is invoked when a received message fails JSON-RPC schema
validation. The error parameter contains details about the validation failure.

#### Type Declaration

- 
(error: Error): void
- #### Parameters

error: ErrorError describing the validation failure

#### Returns void

Implementation of Transport.onerror

- Defined in [src/message-transport.ts:145](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L145)

### `Optional`onmessage[](#onmessage)

onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void
Called when a valid JSON-RPC message is received.

This handler is invoked after message validation succeeds. The [`start`](#start)
method must be called before messages will be received.

#### Type Declaration

- 
(message: JSONRPCMessage, extra?: MessageExtraInfo): void
- #### Parameters

message: JSONRPCMessageThe validated JSON-RPC message

- `Optional`extra: MessageExtraInfoOptional metadata about the message (unused in this transport)

#### Returns void

Implementation of Transport.onmessage

- Defined in [src/message-transport.ts:156](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L156)

### `Optional`sessionId[](#sessionid)

sessionId?: string
Optional session identifier for this transport connection.

Set by the MCP SDK to track the connection session. Not required for
`PostMessageTransport` functionality.

Implementation of Transport.sessionId

- Defined in [src/message-transport.ts:164](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L164)

### `Optional`setProtocolVersion[](#setprotocolversion)

setProtocolVersion?: (version: string) => void
Callback to set the negotiated protocol version.

The MCP SDK calls this during initialization to communicate the protocol
version negotiated with the peer.

#### Type Declaration

- 
(version: string): void
- #### Parameters

version: stringThe negotiated protocol version string

#### Returns void

Implementation of Transport.setProtocolVersion

- Defined in [src/message-transport.ts:174](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L174)

### close[](#close)

- close(): Promise<void>[](#close-1)
Stop listening for messages and cleanup.

Removes the message event listener and calls the [`onclose`](#onclose) callback if set.

#### Returns Promise<void>

Implementation of Transport.close

Defined in [src/message-transport.ts:125](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L125)

### send[](#send)

- send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>[](#send-1)
Send a JSON-RPC message to the target window.

Messages are sent using `postMessage` with `"*"` origin, meaning they are visible
to all frames. The receiver should validate the message source for security.

#### Parameters

message: JSONRPCMessageJSON-RPC message to send

- `Optional`options: TransportSendOptionsOptional send options (currently unused)

#### Returns Promise<void>

Implementation of Transport.send

- Defined in [src/message-transport.ts:115](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L115)

### start[](#start)

- start(): Promise<void>[](#start-1)
Begin listening for messages from the event source.

Registers a message event listener on the window. Must be called before
messages can be received.

#### Returns Promise<void>

Implementation of Transport.start

Defined in [src/message-transport.ts:102](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/message-transport.ts#L102)

