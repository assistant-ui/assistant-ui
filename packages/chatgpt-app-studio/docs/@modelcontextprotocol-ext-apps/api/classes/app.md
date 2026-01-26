# App

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

Main class for MCP Apps to communicate with their host.

The `App` class provides a framework-agnostic way to build interactive MCP Apps
that run inside host applications. It extends the MCP SDK's `Protocol` class and
handles the connection lifecycle, initialization handshake, and bidirectional
communication with the host.

## Architecture[](#architecture)

Views (Apps) act as MCP clients connecting to the host via [`PostMessageTransport`](message-transport.PostMessageTransport.html).
The host proxies requests to the actual MCP server and forwards
responses back to the App.

## Lifecycle[](#lifecycle)

- **Create**: Instantiate App with info and capabilities

- **Connect**: Call `connect()` to establish transport and perform handshake

- **Interactive**: Send requests, receive notifications, call tools

- **Cleanup**: Host sends teardown request before unmounting

## Inherited Methods[](#inherited-methods)

As a subclass of `Protocol`, `App` inherits key methods for handling communication:

- `setRequestHandler()` - Register handlers for requests from host

- `setNotificationHandler()` - Register handlers for notifications from host

#### See[](#see)

`Protocol` from @modelcontextprotocol/sdk for all inherited methods

## Notification Setters[](#notification-setters)

For common notifications, the `App` class provides convenient setter properties
that simplify handler registration:

- `ontoolinput` - Complete tool arguments from host

- `ontoolinputpartial` - Streaming partial tool arguments

- `ontoolresult` - Tool execution results

- `ontoolcancelled` - Tool execution was cancelled by user or host

- `onhostcontextchanged` - Host context changes (theme, locale, etc.)

These setters are convenience wrappers around `setNotificationHandler()`.
Both patterns work; use whichever fits your coding style better.

#### Example: Basic usage with PostMessageTransport[](#example-basic-usage-with-postmessagetransport)

```
`const app = new App(
  { name: "WeatherApp", version: "1.0.0" },
  {}, // capabilities
);

// Register handlers before connecting to ensure no notifications are missed
app.ontoolinput = (params) => {
  console.log("Tool arguments:", params.arguments);
};

await app.connect();
`Copy
```

##### Index

### Constructors

[constructor](#constructor)

### constructor[](#constructor)

- new App(
    _appInfo: {
        description?: string;
        icons?: {
            mimeType?: string;
            sizes?: string[];
            src: string;
            theme?: "light" | "dark";
        }[];
        name: string;
        title?: string;
        version: string;
        websiteUrl?: string;
    },
    _capabilities?: [McpUiAppCapabilities](../interfaces/app.McpUiAppCapabilities.html),
    options?: AppOptions,
): [App]()[](#constructorapp)
Create a new MCP App instance.

#### Parameters

_appInfo: {
    description?: string;
    icons?: {
        mimeType?: string;
        sizes?: string[];
        src: string;
        theme?: "light" | "dark";
    }[];
    name: string;
    title?: string;
    version: string;
    websiteUrl?: string;
}App identification (name and version)

- _capabilities: [McpUiAppCapabilities](../interfaces/app.McpUiAppCapabilities.html) = {}Features and capabilities this app provides

- options: AppOptions = ...Configuration options including `autoResize` behavior

#### Returns [App]()

#### Example[](#example)

```
`const app = new App(
  { name: "MyApp", version: "1.0.0" },
  { tools: { listChanged: true } }, // capabilities
  { autoResize: true }, // options
);
`Copy
```

Overrides Protocol<AppRequest, AppNotification, AppResult>.constructor

- Defined in [src/app.ts:210](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L210)

### `Optional`fallbackNotificationHandler[](#fallbacknotificationhandler)

fallbackNotificationHandler?: (
    notification: {
        method: string;
        params?: {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            [key: string]: unknown;
        };
    },
) => Promise<void>
A handler to invoke for any notification types that do not have their own handler installed.

Inherited from Protocol.fallbackNotificationHandler

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:265

### `Optional`fallbackRequestHandler[](#fallbackrequesthandler)

fallbackRequestHandler?: (
    request: {
        id: string | number;
        jsonrpc: "2.0";
        method: string;
        params?: {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            [key: string]: unknown;
        };
    },
    extra: RequestHandlerExtra<[AppRequest](../types/types.AppRequest.html), [AppNotification](../types/types.AppNotification.html)>,
) => Promise<[AppResult](../types/types.AppResult.html)>
A handler to invoke for any request types that do not have their own handler installed.

Inherited from Protocol.fallbackRequestHandler

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:261

### `Optional`onclose[](#onclose)

onclose?: () => void
Callback for when the connection is closed for any reason.

This is invoked when close() is called as well.

Inherited from Protocol.onclose

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:251

### `Optional`onerror[](#onerror)

onerror?: (error: Error) => void
Callback for when an error occurs.

Note that errors are not necessarily fatal; they are used for reporting any kind of exceptional condition out of band.

Inherited from Protocol.onerror

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:257

### sendOpenLink[](#sendopenlink)

sendOpenLink: (
    params: { url: string },
    options?: RequestOptions,
) => Promise<{ isError?: boolean; [key: string]: unknown }> = ...
#### Type Declaration

- 
(
    params: { url: string },
    options?: RequestOptions,
): Promise<{ isError?: boolean; [key: string]: unknown }>
- Request the host to open an external URL in the default browser.

The host may deny this request based on user preferences or security policy.
Apps should handle rejection gracefully by checking `result.isError`.

#### Parameters

params: { url: string }URL to open

##### url: string

#### Description[](#description)

URL to open in the host's browser

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<{ isError?: boolean; [key: string]: unknown }>

Result with `isError: true` if the host denied the request (e.g., blocked domain, user cancelled)

#### Throws[](#throws)

If the request times out or the connection is lost

#### Example: Open documentation link[](#example-open-documentation-link)

```
`const { isError } = await app.openLink({ url: "https://docs.example.com" });
if (isError) {
  // Host denied the request (e.g., blocked domain, user cancelled)
  // Optionally show fallback: display URL for manual copy
  console.warn("Link request denied");
}
`Copy
```

#### See[](#see-1)

- [`McpUiOpenLinkRequest`](../interfaces/app.McpUiOpenLinkRequest.html) for request structure

- [`McpUiOpenLinkResult`](../interfaces/app.McpUiOpenLinkResult.html) for result structure

#### Deprecated[](#deprecated)

Use [`openLink`](#openlink) instead

- Defined in [src/app.ts:932](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L932)

### oncalltool[](#oncalltool)

- set oncalltool(
    callback: (
        params: {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            arguments?: { [key: string]: unknown };
            name: string;
            task?: { ttl?: number };
        },
        extra: RequestHandlerExtra,
    ) => Promise<
        {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            content: (
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ((...) | (...))[];
                        lastModified?: string;
                        priority?: number;
                    };
                    text: string;
                    type: "text";
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ((...) | (...))[];
                        lastModified?: string;
                        priority?: number;
                    };
                    data: string;
                    mimeType: string;
                    type: "image";
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ((...) | (...))[];
                        lastModified?: string;
                        priority?: number;
                    };
                    data: string;
                    mimeType: string;
                    type: "audio";
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ((...) | (...))[];
                        lastModified?: string;
                        priority?: number;
                    };
                    description?: string;
                    icons?: {
                        mimeType?: string;
                        sizes?: (...)[];
                        src: string;
                        theme?: "light" | "dark";
                    }[];
                    mimeType?: string;
                    name: string;
                    title?: string;
                    type: "resource_link";
                    uri: string;
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ((...) | (...))[];
                        lastModified?: string;
                        priority?: number;
                    };
                    resource: | {
                        _meta?: { [key: string]: unknown };
                        mimeType?: string;
                        text: string;
                        uri: string;
                    }
                    | {
                        _meta?: { [key: string]: unknown };
                        blob: string;
                        mimeType?: string;
                        uri: string;
                    };
                    type: "resource";
                }
            )[];
            isError?: boolean;
            structuredContent?: { [key: string]: unknown };
            [key: string]: unknown;
        },
    >,
): void
Convenience handler for tool call requests from the host.

Set this property to register a handler that will be called when the host
requests this app to execute a tool. This enables apps to provide their own
tools that can be called by the host or LLM.

The app must declare tool capabilities in the constructor to use this handler.

This setter is a convenience wrapper around `setRequestHandler()` that
automatically handles the request schema and extracts the params for you.

Register handlers before calling [`connect`](#connect) to avoid missing requests.

#### Parameters

callback: (
    params: {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        arguments?: { [key: string]: unknown };
        name: string;
        task?: { ttl?: number };
    },
    extra: RequestHandlerExtra,
) => Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        content: (
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ((...) | (...))[];
                    lastModified?: string;
                    priority?: number;
                };
                text: string;
                type: "text";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ((...) | (...))[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "image";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ((...) | (...))[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "audio";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ((...) | (...))[];
                    lastModified?: string;
                    priority?: number;
                };
                description?: string;
                icons?: {
                    mimeType?: string;
                    sizes?: (...)[];
                    src: string;
                    theme?: "light" | "dark";
                }[];
                mimeType?: string;
                name: string;
                title?: string;
                type: "resource_link";
                uri: string;
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ((...) | (...))[];
                    lastModified?: string;
                    priority?: number;
                };
                resource: | {
                    _meta?: { [key: string]: unknown };
                    mimeType?: string;
                    text: string;
                    uri: string;
                }
                | {
                    _meta?: { [key: string]: unknown };
                    blob: string;
                    mimeType?: string;
                    uri: string;
                };
                type: "resource";
            }
        )[];
        isError?: boolean;
        structuredContent?: { [key: string]: unknown };
        [key: string]: unknown;
    },
>Async function that executes the tool and returns the result.
The callback will only be invoked if the app declared tool capabilities
in the constructor.

#### Returns void

#### Example: Handle tool calls from the host[](#example-handle-tool-calls-from-the-host)

```
`app.oncalltool = async (params, extra) => {
  if (params.name === "greet") {
    const name = params.arguments?.name ?? "World";
    return { content: [{ type: "text", text: `Hello, ${name}!` }] };
  }
  throw new Error(`Unknown tool: ${params.name}`);
};
`Copy
```

#### See[](#see-2)

[`setRequestHandler`](#setrequesthandler) for the underlying method

- Defined in [src/app.ts:589](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L589)

### onhostcontextchanged[](#onhostcontextchanged)

- set onhostcontextchanged(callback: (params: [McpUiHostContext](../interfaces/app.McpUiHostContext.html)) => void): void
Convenience handler for host context changes (theme, locale, etc.).

Set this property to register a handler that will be called when the host's
context changes, such as theme switching (light/dark), locale changes, or
other environmental updates. Apps should respond by updating their UI
accordingly.

This setter is a convenience wrapper around `setNotificationHandler()` that
automatically handles the notification schema and extracts the params for you.

Notification params are automatically merged into the internal host context
before the callback is invoked. This means [`getHostContext`](#gethostcontext) will
return the updated values even before your callback runs.

Register handlers before calling [`connect`](#connect) to avoid missing notifications.

#### Parameters

callback: (params: [McpUiHostContext](../interfaces/app.McpUiHostContext.html)) => voidFunction called with the updated host context

#### Returns void

#### Example: Respond to theme changes[](#example-respond-to-theme-changes)

```
`app.onhostcontextchanged = (params) => {
  if (params.theme === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
};
`Copy
```

#### See[](#see-3)

- [`setNotificationHandler`](#setnotificationhandler) for the underlying method

- [`McpUiHostContextChangedNotification`](../interfaces/app.McpUiHostContextChangedNotification.html) for the notification structure

- [`McpUiHostContext`](../interfaces/app.McpUiHostContext.html) for the full context structure

- Defined in [src/app.ts:502](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L502)

### onlisttools[](#onlisttools)

- set onlisttools(
    callback: (
        params:
            | {
                _meta?: {
                    "io.modelcontextprotocol/related-task"?: { taskId: string };
                    progressToken?: string | number;
                    [key: string]: unknown;
                };
                cursor?: string;
            }
            | undefined,
        extra: RequestHandlerExtra,
    ) => Promise<{ tools: string[] }>,
): void
Convenience handler for listing available tools.

Set this property to register a handler that will be called when the host
requests a list of tools this app provides. This enables dynamic tool
discovery by the host or LLM.

The app must declare tool capabilities in the constructor to use this handler.

This setter is a convenience wrapper around `setRequestHandler()` that
automatically handles the request schema and extracts the params for you.

Register handlers before calling [`connect`](#connect) to avoid missing requests.

#### Parameters

callback: (
    params:
        | {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            cursor?: string;
        }
        | undefined,
    extra: RequestHandlerExtra,
) => Promise<{ tools: string[] }>Async function that returns tool names as strings (simplified
from full `ListToolsResult` with `Tool` objects). Registration is always
allowed; capability validation occurs when handlers are invoked.

#### Returns void

#### Example: Return available tools[](#example-return-available-tools)

```
`app.onlisttools = async (params, extra) => {
  return {
    tools: ["greet", "calculate", "format"],
  };
};
`Copy
```

#### See[](#see-4)

- [`setRequestHandler`](#setrequesthandler) for the underlying method

- [`oncalltool`](#oncalltool) for handling tool execution

- Defined in [src/app.ts:630](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L630)

### onteardown[](#onteardown)

- set onteardown(
    callback: (
        params: {},
        extra: RequestHandlerExtra,
    ) => [McpUiResourceTeardownResult](../interfaces/app.McpUiResourceTeardownResult.html) | Promise<[McpUiResourceTeardownResult](../interfaces/app.McpUiResourceTeardownResult.html)>,
): void
Convenience handler for graceful shutdown requests from the host.

Set this property to register a handler that will be called when the host
requests the app to prepare for teardown. This allows the app to perform
cleanup operations (save state, close connections, etc.) before being unmounted.

The handler can be sync or async. The host will wait for the returned promise
to resolve before proceeding with teardown.

This setter is a convenience wrapper around `setRequestHandler()` that
automatically handles the request schema.

Register handlers before calling [`connect`](#connect) to avoid missing requests.

#### Parameters

callback: (
    params: {},
    extra: RequestHandlerExtra,
) => [McpUiResourceTeardownResult](../interfaces/app.McpUiResourceTeardownResult.html) | Promise<[McpUiResourceTeardownResult](../interfaces/app.McpUiResourceTeardownResult.html)>Function called when teardown is requested.
Must return `McpUiResourceTeardownResult` (can be an empty object `{}`) or a Promise resolving to it.

#### Returns void

#### Example: Perform cleanup before teardown[](#example-perform-cleanup-before-teardown)

```
`app.onteardown = async () => {
  await saveState();
  closeConnections();
  console.log("App ready for teardown");
  return {};
};
`Copy
```

#### See[](#see-5)

- [`setRequestHandler`](#setrequesthandler) for the underlying method

- [`McpUiResourceTeardownRequest`](../interfaces/app.McpUiResourceTeardownRequest.html) for the request structure

- Defined in [src/app.ts:546](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L546)

### ontoolcancelled[](#ontoolcancelled)

- set ontoolcancelled(callback: (params: { reason?: string }) => void): void
Convenience handler for receiving tool cancellation notifications from the host.

Set this property to register a handler that will be called when the host
notifies that tool execution was cancelled. This can occur for various reasons
including user action, sampling error, classifier intervention, or other
interruptions. Apps should update their state and display appropriate feedback.

This setter is a convenience wrapper around `setNotificationHandler()` that
automatically handles the notification schema and extracts the params for you.

Register handlers before calling [`connect`](#connect) to avoid missing notifications.

#### Parameters

callback: (params: { reason?: string }) => voidFunction called when tool execution is cancelled. Receives optional cancellation reason — see [`McpUiToolCancelledNotification.params`](../interfaces/app.McpUiToolCancelledNotification.html#params).

#### Returns void

#### Example: Handle tool cancellation[](#example-handle-tool-cancellation)

```
`app.ontoolcancelled = (params) => {
  console.log("Tool cancelled:", params.reason);
  // Update your UI to show cancellation state
};
`Copy
```

#### See[](#see-6)

- [`setNotificationHandler`](#setnotificationhandler) for the underlying method

- [`McpUiToolCancelledNotification`](../interfaces/app.McpUiToolCancelledNotification.html) for the notification structure

- [`ontoolresult`](#ontoolresult) for successful tool completion

- Defined in [src/app.ts:460](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L460)

### ontoolinput[](#ontoolinput)

- set ontoolinput(
    callback: (params: { arguments?: Record<string, unknown> }) => void,
): void
Convenience handler for receiving complete tool input from the host.

Set this property to register a handler that will be called when the host
sends a tool's complete arguments. This is sent after a tool call begins
and before the tool result is available.

This setter is a convenience wrapper around `setNotificationHandler()` that
automatically handles the notification schema and extracts the params for you.

Register handlers before calling [`connect`](#connect) to avoid missing notifications.

#### Parameters

callback: (params: { arguments?: Record<string, unknown> }) => voidFunction called with the tool input params ([`McpUiToolInputNotification.params`](../interfaces/app.McpUiToolInputNotification.html#params))

#### Returns void

#### Example[](#example-1)

```
`// Register before connecting to ensure no notifications are missed
app.ontoolinput = (params) => {
  console.log("Tool:", params.arguments);
  // Update your UI with the tool arguments
};
await app.connect();
`Copy
```

#### See[](#see-7)

- [`setNotificationHandler`](#setnotificationhandler) for the underlying method

- [`McpUiToolInputNotification`](../interfaces/app.McpUiToolInputNotification.html) for the notification structure

- Defined in [src/app.ts:332](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L332)

### ontoolinputpartial[](#ontoolinputpartial)

- set ontoolinputpartial(
    callback: (params: { arguments?: Record<string, unknown> }) => void,
): void
Convenience handler for receiving streaming partial tool input from the host.

Set this property to register a handler that will be called as the host
streams partial tool arguments during tool call initialization. This enables
progressive rendering of tool arguments before they're complete.

**Important:** Partial arguments are "healed" JSON — the host closes unclosed
brackets/braces to produce valid JSON. This means objects may be incomplete
(e.g., the last item in an array may be truncated). Use partial data only
for preview UI, not for critical operations.

This setter is a convenience wrapper around `setNotificationHandler()` that
automatically handles the notification schema and extracts the params for you.

Register handlers before calling [`connect`](#connect) to avoid missing notifications.

#### Parameters

callback: (params: { arguments?: Record<string, unknown> }) => voidFunction called with each partial tool input update ([`McpUiToolInputPartialNotification.params`](../interfaces/app.McpUiToolInputPartialNotification.html#params))

#### Returns void

#### Example: Progressive rendering of tool arguments[](#example-progressive-rendering-of-tool-arguments)

```
`let toolInputs: Record<string, unknown> | null = null;
let toolInputsPartial: Record<string, unknown> | null = null;

app.ontoolinputpartial = (params) => {
  toolInputsPartial = params.arguments as Record<string, unknown>;
  render();
};

app.ontoolinput = (params) => {
  toolInputs = params.arguments as Record<string, unknown>;
  toolInputsPartial = null;
  render();
};

function render() {
  if (toolInputs) {
    renderFinalUI(toolInputs);
  } else {
    renderLoadingUI(toolInputsPartial); // e.g., shimmer with partial preview
  }
}
`Copy
```

#### See[](#see-8)

- [`setNotificationHandler`](#setnotificationhandler) for the underlying method

- [`McpUiToolInputPartialNotification`](../interfaces/app.McpUiToolInputPartialNotification.html) for the notification structure

- [`ontoolinput`](#ontoolinput) for the complete tool input handler

- Defined in [src/app.ts:388](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L388)

### ontoolresult[](#ontoolresult)

- set ontoolresult(
    callback: (
        params: {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            content: (
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ("user" | "assistant")[];
                        lastModified?: string;
                        priority?: number;
                    };
                    text: string;
                    type: "text";
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ("user" | "assistant")[];
                        lastModified?: string;
                        priority?: number;
                    };
                    data: string;
                    mimeType: string;
                    type: "image";
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ("user" | "assistant")[];
                        lastModified?: string;
                        priority?: number;
                    };
                    data: string;
                    mimeType: string;
                    type: "audio";
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ("user" | "assistant")[];
                        lastModified?: string;
                        priority?: number;
                    };
                    description?: string;
                    icons?: {
                        mimeType?: string;
                        sizes?: string[];
                        src: string;
                        theme?: "light"
                        | "dark";
                    }[];
                    mimeType?: string;
                    name: string;
                    title?: string;
                    type: "resource_link";
                    uri: string;
                }
                | {
                    _meta?: { [key: string]: unknown };
                    annotations?: {
                        audience?: ("user" | "assistant")[];
                        lastModified?: string;
                        priority?: number;
                    };
                    resource: | {
                        _meta?: { [key: string]: unknown };
                        mimeType?: string;
                        text: string;
                        uri: string;
                    }
                    | {
                        _meta?: { [key: string]: unknown };
                        blob: string;
                        mimeType?: string;
                        uri: string;
                    };
                    type: "resource";
                }
            )[];
            isError?: boolean;
            structuredContent?: { [key: string]: unknown };
            [key: string]: unknown;
        },
    ) => void,
): void
Convenience handler for receiving tool execution results from the host.

Set this property to register a handler that will be called when the host
sends the result of a tool execution. This is sent after the tool completes
on the MCP server, allowing your app to display the results or update its state.

This setter is a convenience wrapper around `setNotificationHandler()` that
automatically handles the notification schema and extracts the params for you.

Register handlers before calling [`connect`](#connect) to avoid missing notifications.

#### Parameters

callback: (
    params: {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        content: (
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                text: string;
                type: "text";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "image";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "audio";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                description?: string;
                icons?: {
                    mimeType?: string;
                    sizes?: string[];
                    src: string;
                    theme?: "light"
                    | "dark";
                }[];
                mimeType?: string;
                name: string;
                title?: string;
                type: "resource_link";
                uri: string;
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                resource: | {
                    _meta?: { [key: string]: unknown };
                    mimeType?: string;
                    text: string;
                    uri: string;
                }
                | {
                    _meta?: { [key: string]: unknown };
                    blob: string;
                    mimeType?: string;
                    uri: string;
                };
                type: "resource";
            }
        )[];
        isError?: boolean;
        structuredContent?: { [key: string]: unknown };
        [key: string]: unknown;
    },
) => voidFunction called with the tool result ([`McpUiToolResultNotification.params`](../interfaces/app.McpUiToolResultNotification.html#params))

#### Returns void

#### Example: Display tool execution results[](#example-display-tool-execution-results)

```
`app.ontoolresult = (params) => {
  if (params.isError) {
    console.error("Tool execution failed:", params.content);
  } else if (params.content) {
    console.log("Tool output:", params.content);
  }
};
`Copy
```

#### See[](#see-9)

- [`setNotificationHandler`](#setnotificationhandler) for the underlying method

- [`McpUiToolResultNotification`](../interfaces/app.McpUiToolResultNotification.html) for the notification structure

- [`ontoolinput`](#ontoolinput) for the initial tool input handler

- Defined in [src/app.ts:425](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L425)

### transport[](#transport)

- get transport(): Transport | undefined
#### Returns Transport | undefined

Inherited from Protocol.transport

Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:283

### assertCanSetRequestHandler[](#assertcansetrequesthandler)

- assertCanSetRequestHandler(method: string): void[](#assertcansetrequesthandler-1)
Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.

#### Parameters

method: string

#### Returns void

Inherited from Protocol.assertCanSetRequestHandler

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:397

### assertCapabilityForMethod[](#assertcapabilityformethod)

- assertCapabilityForMethod(
    method:
        | "ui/open-link"
        | "ui/message"
        | "ui/update-model-context"
        | "ui/resource-teardown"
        | "ui/initialize"
        | "ui/request-display-mode"
        | "tools/call"
        | "tools/list"
        | "resources/list"
        | "resources/templates/list"
        | "resources/read"
        | "prompts/list"
        | "ping",
): void[](#assertcapabilityformethod-1)
`Internal`Verify that the host supports the capability required for the given request method.

#### Parameters

method: 
    | "ui/open-link"
    | "ui/message"
    | "ui/update-model-context"
    | "ui/resource-teardown"
    | "ui/initialize"
    | "ui/request-display-mode"
    | "tools/call"
    | "tools/list"
    | "resources/list"
    | "resources/templates/list"
    | "resources/read"
    | "prompts/list"
    | "ping"

#### Returns void

Overrides Protocol.assertCapabilityForMethod

- Defined in [src/app.ts:645](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L645)

### assertNotificationCapability[](#assertnotificationcapability)

- assertNotificationCapability(
    method:
        | "ui/notifications/sandbox-proxy-ready"
        | "ui/notifications/sandbox-resource-ready"
        | "ui/notifications/size-changed"
        | "ui/notifications/tool-input"
        | "ui/notifications/tool-input-partial"
        | "ui/notifications/tool-result"
        | "ui/notifications/tool-cancelled"
        | "ui/notifications/host-context-changed"
        | "ui/notifications/initialized"
        | "notifications/tools/list_changed"
        | "notifications/resources/list_changed"
        | "notifications/prompts/list_changed"
        | "notifications/message",
): void[](#assertnotificationcapability-1)
`Internal`Verify that the app supports the capability required for the given notification method.

#### Parameters

method: 
    | "ui/notifications/sandbox-proxy-ready"
    | "ui/notifications/sandbox-resource-ready"
    | "ui/notifications/size-changed"
    | "ui/notifications/tool-input"
    | "ui/notifications/tool-input-partial"
    | "ui/notifications/tool-result"
    | "ui/notifications/tool-cancelled"
    | "ui/notifications/host-context-changed"
    | "ui/notifications/initialized"
    | "notifications/tools/list_changed"
    | "notifications/resources/list_changed"
    | "notifications/prompts/list_changed"
    | "notifications/message"

#### Returns void

Overrides Protocol.assertNotificationCapability

- Defined in [src/app.ts:675](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L675)

### assertRequestHandlerCapability[](#assertrequesthandlercapability)

- assertRequestHandlerCapability(
    method:
        | "ui/open-link"
        | "ui/message"
        | "ui/update-model-context"
        | "ui/resource-teardown"
        | "ui/initialize"
        | "ui/request-display-mode"
        | "tools/call"
        | "tools/list"
        | "resources/list"
        | "resources/templates/list"
        | "resources/read"
        | "prompts/list"
        | "ping",
): void[](#assertrequesthandlercapability-1)
`Internal`Verify that the app declared the capability required for the given request method.

#### Parameters

method: 
    | "ui/open-link"
    | "ui/message"
    | "ui/update-model-context"
    | "ui/resource-teardown"
    | "ui/initialize"
    | "ui/request-display-mode"
    | "tools/call"
    | "tools/list"
    | "resources/list"
    | "resources/templates/list"
    | "resources/read"
    | "prompts/list"
    | "ping"

#### Returns void

Overrides Protocol.assertRequestHandlerCapability

- Defined in [src/app.ts:653](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L653)

### `Protected`assertTaskCapability[](#asserttaskcapability)

- assertTaskCapability(_method: string): void[](#asserttaskcapability-1)
`Internal`Verify that task creation is supported for the given request method.

#### Parameters

_method: string

#### Returns void

Overrides Protocol.assertTaskCapability

- Defined in [src/app.ts:683](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L683)

### `Protected`assertTaskHandlerCapability[](#asserttaskhandlercapability)

- assertTaskHandlerCapability(_method: string): void[](#asserttaskhandlercapability-1)
`Internal`Verify that task handler is supported for the given method.

#### Parameters

_method: string

#### Returns void

Overrides Protocol.assertTaskHandlerCapability

- Defined in [src/app.ts:691](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L691)

### callServerTool[](#callservertool)

- callServerTool(
    params: {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        arguments?: { [key: string]: unknown };
        name: string;
        task?: { ttl?: number };
    },
    options?: RequestOptions,
): Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        content: (
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                text: string;
                type: "text";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "image";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "audio";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                description?: string;
                icons?: {
                    mimeType?: string;
                    sizes?: string[];
                    src: string;
                    theme?: "light"
                    | "dark";
                }[];
                mimeType?: string;
                name: string;
                title?: string;
                type: "resource_link";
                uri: string;
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                resource: | {
                    _meta?: { [key: string]: unknown };
                    mimeType?: string;
                    text: string;
                    uri: string;
                }
                | {
                    _meta?: { [key: string]: unknown };
                    blob: string;
                    mimeType?: string;
                    uri: string;
                };
                type: "resource";
            }
        )[];
        isError?: boolean;
        structuredContent?: { [key: string]: unknown };
        [key: string]: unknown;
    },
>[](#callservertool-1)
Call a tool on the originating MCP server (proxied through the host).

Apps can call tools to fetch fresh data or trigger server-side actions.
The host proxies the request to the actual MCP server and returns the result.

#### Parameters

params: {
    _meta?: {
        "io.modelcontextprotocol/related-task"?: { taskId: string };
        progressToken?: string | number;
        [key: string]: unknown;
    };
    arguments?: { [key: string]: unknown };
    name: string;
    task?: { ttl?: number };
}Tool name and arguments

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        content: (
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                text: string;
                type: "text";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "image";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                data: string;
                mimeType: string;
                type: "audio";
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                description?: string;
                icons?: {
                    mimeType?: string;
                    sizes?: string[];
                    src: string;
                    theme?: "light"
                    | "dark";
                }[];
                mimeType?: string;
                name: string;
                title?: string;
                type: "resource_link";
                uri: string;
            }
            | {
                _meta?: { [key: string]: unknown };
                annotations?: {
                    audience?: ("user" | "assistant")[];
                    lastModified?: string;
                    priority?: number;
                };
                resource: | {
                    _meta?: { [key: string]: unknown };
                    mimeType?: string;
                    text: string;
                    uri: string;
                }
                | {
                    _meta?: { [key: string]: unknown };
                    blob: string;
                    mimeType?: string;
                    uri: string;
                };
                type: "resource";
            }
        )[];
        isError?: boolean;
        structuredContent?: { [key: string]: unknown };
        [key: string]: unknown;
    },
>

Tool execution result

#### Throws[](#throws-1)

If the tool does not exist on the server

#### Throws[](#throws-2)

If the request times out or the connection is lost

#### Throws[](#throws-3)

If the host rejects the request

Note: Tool-level execution errors are returned in the result with `isError: true`
rather than throwing exceptions. Always check `result.isError` to distinguish
between transport failures (thrown) and tool execution failures (returned).

#### Example: Fetch updated weather data[](#example-fetch-updated-weather-data)

```
`try {
  const result = await app.callServerTool({
    name: "get_weather",
    arguments: { location: "Tokyo" },
  });
  if (result.isError) {
    console.error("Tool returned error:", result.content);
  } else {
    console.log(result.content);
  }
} catch (error) {
  console.error("Tool call failed:", error);
}
`Copy
```

- Defined in [src/app.ts:730](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L730)

### `Protected`cancelTask[](#canceltask)

- cancelTask(
    params: { taskId: string },
    options?: RequestOptions,
): Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        createdAt: string;
        lastUpdatedAt: string;
        pollInterval?: number;
        status: | "working"
        | "input_required"
        | "completed"
        | "failed"
        | "cancelled";
        statusMessage?: string;
        taskId: string;
        ttl: number
        | null;
    },
>[](#canceltask-1)
`Experimental`Cancels a specific task.

Use `client.experimental.tasks.cancelTask()` to access this method.

#### Parameters

params: { taskId: string }
- `Optional`options: RequestOptions

#### Returns Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        createdAt: string;
        lastUpdatedAt: string;
        pollInterval?: number;
        status: | "working"
        | "input_required"
        | "completed"
        | "failed"
        | "cancelled";
        statusMessage?: string;
        taskId: string;
        ttl: number
        | null;
    },
>

Inherited from Protocol.cancelTask

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:377

### close[](#close)

- close(): Promise<void>[](#close-1)
Closes the connection.

#### Returns Promise<void>

Inherited from Protocol.close

Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:287

### connect[](#connect)

- connect(transport?: Transport, options?: RequestOptions): Promise<void>[](#connect-1)
Establish connection with the host and perform initialization handshake.

This method performs the following steps:

Connects the transport layer

- Sends `ui/initialize` request with app info and capabilities

- Receives host capabilities and context in response

- Sends `ui/notifications/initialized` notification

- Sets up auto-resize using [`setupSizeChangedNotifications`](#setupsizechangednotifications) if enabled (default)

If initialization fails, the connection is automatically closed and an error
is thrown.

#### Parameters

- transport: Transport = ...Transport layer (typically [`PostMessageTransport`](message-transport.PostMessageTransport.html))

- `Optional`options: RequestOptionsRequest options for the initialize request

#### Returns Promise<void>

#### Throws[](#throws-4)

If initialization fails or connection is lost

#### Example: Connect with PostMessageTransport[](#example-connect-with-postmessagetransport)

```
`const app = new App({ name: "MyApp", version: "1.0.0" }, {});

try {
  await app.connect(new PostMessageTransport(window.parent, window.parent));
  console.log("Connected successfully!");
} catch (error) {
  console.error("Failed to connect:", error);
}
`Copy
```

#### See[](#see-10)

- [`McpUiInitializeRequest`](../interfaces/app.McpUiInitializeRequest.html) for the initialization request structure

- [`McpUiInitializedNotification`](../interfaces/app.McpUiInitializedNotification.html) for the initialized notification

- [`PostMessageTransport`](message-transport.PostMessageTransport.html) for the typical transport implementation

Overrides Protocol.connect

- Defined in [src/app.ts:1114](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L1114)

### getHostCapabilities[](#gethostcapabilities)

- getHostCapabilities(): [McpUiHostCapabilities](../interfaces/app.McpUiHostCapabilities.html) | undefined[](#gethostcapabilities-1)
Get the host's capabilities discovered during initialization.

Returns the capabilities that the host advertised during the
[`connect`](#connect) handshake. Returns `undefined` if called before
connection is established.

#### Returns [McpUiHostCapabilities](../interfaces/app.McpUiHostCapabilities.html) | undefined

Host capabilities, or `undefined` if not yet connected

#### Example: Check host capabilities after connection[](#example-check-host-capabilities-after-connection)

```
`await app.connect();
if (app.getHostCapabilities()?.serverTools) {
  console.log("Host supports server tool calls");
}
`Copy
```

#### See[](#see-11)

[`connect`](#connect) for the initialization handshake

- [`McpUiHostCapabilities`](../interfaces/app.McpUiHostCapabilities.html) for the capabilities structure

- Defined in [src/app.ts:247](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L247)

### getHostContext[](#gethostcontext)

- getHostContext(): [McpUiHostContext](../interfaces/app.McpUiHostContext.html) | undefined[](#gethostcontext-1)
Get the host context discovered during initialization.

Returns the host context that was provided in the initialization response,
including tool info, theme, locale, and other environment details.
This context is automatically updated when the host sends
`ui/notifications/host-context-changed` notifications.

Returns `undefined` if called before connection is established.

#### Returns [McpUiHostContext](../interfaces/app.McpUiHostContext.html) | undefined

Host context, or `undefined` if not yet connected

#### Example: Access host context after connection[](#example-access-host-context-after-connection)

```
`await app.connect(transport);
const context = app.getHostContext();
if (context?.theme === "dark") {
  document.body.classList.add("dark-theme");
}
if (context?.toolInfo) {
  console.log("Tool:", context.toolInfo.tool.name);
}
`Copy
```

#### See[](#see-12)

[`connect`](#connect) for the initialization handshake

- [`onhostcontextchanged`](#onhostcontextchanged) for context change notifications

- [`McpUiHostContext`](../interfaces/app.McpUiHostContext.html) for the context structure

- Defined in [src/app.ts:301](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L301)

### getHostVersion[](#gethostversion)

- getHostVersion(): | {
    description?: string;
    icons?: {
        mimeType?: string;
        sizes?: string[];
        src: string;
        theme?: "light"
        | "dark";
    }[];
    name: string;
    title?: string;
    version: string;
    websiteUrl?: string;
}
| undefined[](#gethostversion-1)
Get the host's implementation info discovered during initialization.

Returns the host's name and version as advertised during the
[`connect`](#connect) handshake. Returns `undefined` if called before
connection is established.

#### Returns 
    | {
        description?: string;
        icons?: {
            mimeType?: string;
            sizes?: string[];
            src: string;
            theme?: "light"
            | "dark";
        }[];
        name: string;
        title?: string;
        version: string;
        websiteUrl?: string;
    }
    | undefined

Host implementation info, or `undefined` if not yet connected

#### Example: Log host information after connection[](#example-log-host-information-after-connection)

```
`await app.connect(transport);
const { name, version } = app.getHostVersion() ?? {};
console.log(`Connected to ${name} v${version}`);
`Copy
```

#### See[](#see-13)

[`connect`](#connect) for the initialization handshake

Defined in [src/app.ts:269](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L269)

### `Protected`getTask[](#gettask)

- getTask(
    params: {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        taskId: string;
    },
    options?: RequestOptions,
): Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        createdAt: string;
        lastUpdatedAt: string;
        pollInterval?: number;
        status: | "working"
        | "input_required"
        | "completed"
        | "failed"
        | "cancelled";
        statusMessage?: string;
        taskId: string;
        ttl: number
        | null;
    },
>[](#gettask-1)
`Experimental`Gets the current status of a task.

Use `client.experimental.tasks.getTask()` to access this method.

#### Parameters

params: {
    _meta?: {
        "io.modelcontextprotocol/related-task"?: { taskId: string };
        progressToken?: string | number;
        [key: string]: unknown;
    };
    taskId: string;
}
- `Optional`options: RequestOptions

#### Returns Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        createdAt: string;
        lastUpdatedAt: string;
        pollInterval?: number;
        status: | "working"
        | "input_required"
        | "completed"
        | "failed"
        | "cancelled";
        statusMessage?: string;
        taskId: string;
        ttl: number
        | null;
    },
>

Inherited from Protocol.getTask

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:357

### `Protected`getTaskResult[](#gettaskresult)

- getTaskResult<[T](#gettaskresultt) extends AnySchema>(
    params: {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        taskId: string;
    },
    resultSchema: [T](#gettaskresultt),
    options?: RequestOptions,
): Promise<SchemaOutput<[T](#gettaskresultt)>>[](#gettaskresult-1)
`Experimental`Retrieves the result of a completed task.

Use `client.experimental.tasks.getTaskResult()` to access this method.

#### Type Parameters

T extends AnySchema

### `Protected`listTasks[](#listtasks)

- listTasks(
    params?: { cursor?: string },
    options?: RequestOptions,
): Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        nextCursor?: string;
        tasks: {
            createdAt: string;
            lastUpdatedAt: string;
            pollInterval?: number;
            status: | "working"
            | "input_required"
            | "completed"
            | "failed"
            | "cancelled";
            statusMessage?: string;
            taskId: string;
            ttl: number
            | null;
        }[];
        [key: string]: unknown;
    },
>[](#listtasks-1)
`Experimental`Lists tasks, optionally starting from a pagination cursor.

Use `client.experimental.tasks.listTasks()` to access this method.

#### Parameters

`Optional`params: { cursor?: string }
- `Optional`options: RequestOptions

#### Returns Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        nextCursor?: string;
        tasks: {
            createdAt: string;
            lastUpdatedAt: string;
            pollInterval?: number;
            status: | "working"
            | "input_required"
            | "completed"
            | "failed"
            | "cancelled";
            statusMessage?: string;
            taskId: string;
            ttl: number
            | null;
        }[];
        [key: string]: unknown;
    },
>

Inherited from Protocol.listTasks

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:369

### notification[](#notification)

- notification(
    notification: [AppNotification](../types/types.AppNotification.html),
    options?: NotificationOptions,
): Promise<void>[](#notification-1)
Emits a notification, which is a one-way message that does not expect a response.

#### Parameters

notification: [AppNotification](../types/types.AppNotification.html)
- `Optional`options: NotificationOptions

#### Returns Promise<void>

Inherited from Protocol.notification

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:383

### openLink[](#openlink)

- openLink(
    params: { url: string },
    options?: RequestOptions,
): Promise<{ isError?: boolean; [key: string]: unknown }>[](#openlink-1)
Request the host to open an external URL in the default browser.

The host may deny this request based on user preferences or security policy.
Apps should handle rejection gracefully by checking `result.isError`.

#### Parameters

params: { url: string }URL to open

##### url: string

#### Description[](#description-1)

URL to open in the host's browser

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<{ isError?: boolean; [key: string]: unknown }>

Result with `isError: true` if the host denied the request (e.g., blocked domain, user cancelled)

#### Throws[](#throws-5)

If the request times out or the connection is lost

#### Example: Open documentation link[](#example-open-documentation-link-1)

```
`const { isError } = await app.openLink({ url: "https://docs.example.com" });
if (isError) {
  // Host denied the request (e.g., blocked domain, user cancelled)
  // Optionally show fallback: display URL for manual copy
  console.warn("Link request denied");
}
`Copy
```

#### See[](#see-14)

- [`McpUiOpenLinkRequest`](../interfaces/app.McpUiOpenLinkRequest.html) for request structure

- [`McpUiOpenLinkResult`](../interfaces/app.McpUiOpenLinkResult.html) for result structure

- Defined in [src/app.ts:920](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L920)

### removeNotificationHandler[](#removenotificationhandler)

- removeNotificationHandler(method: string): void[](#removenotificationhandler-1)
Removes the notification handler for the given method.

#### Parameters

method: string

#### Returns void

Inherited from Protocol.removeNotificationHandler

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:407

### removeRequestHandler[](#removerequesthandler)

- removeRequestHandler(method: string): void[](#removerequesthandler-1)
Removes the request handler for the given method.

#### Parameters

method: string

#### Returns void

Inherited from Protocol.removeRequestHandler

- Defined in node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts:393

### request[](#request)

- request<[T](#requestt) extends AnySchema>(
    request: [AppRequest](../types/types.AppRequest.html),
    resultSchema: [T](#requestt),
    options?: RequestOptions,
): Promise<SchemaOutput<[T](#requestt)>>[](#request-1)
Sends a request and waits for a response.

Do not use this method to emit notifications! Use notification() instead.

#### Type Parameters

T extends AnySchema

### requestDisplayMode[](#requestdisplaymode)

- requestDisplayMode(
    params: { mode: [McpUiDisplayMode](../types/app.McpUiDisplayMode.html) },
    options?: RequestOptions,
): Promise<
    { mode: "inline"
    | "fullscreen"
    | "pip"; [key: string]: unknown },
>[](#requestdisplaymode-1)
Request a change to the display mode.

Requests the host to change the UI container to the specified display mode
(e.g., "inline", "fullscreen", "pip"). The host will respond with the actual
display mode that was set, which may differ from the requested mode if
the requested mode is not available (check `availableDisplayModes` in host context).

#### Parameters

params: { mode: [McpUiDisplayMode](../types/app.McpUiDisplayMode.html) }The display mode being requested

##### mode: [McpUiDisplayMode](../types/app.McpUiDisplayMode.html)

#### Description[](#description-2)

The display mode being requested.

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<{ mode: "inline" | "fullscreen" | "pip"; [key: string]: unknown }>

Result containing the actual display mode that was set

#### Example: Toggle display mode[](#example-toggle-display-mode)

```
`const ctx = app.getHostContext();
if (ctx?.availableDisplayModes?.includes("fullscreen")) {
  const target = ctx.displayMode === "fullscreen" ? "inline" : "fullscreen";
  const result = await app.requestDisplayMode({ mode: target });
  console.log("Now in:", result.mode);
}
`Copy
```

#### See[](#see-15)

- [`McpUiRequestDisplayModeRequest`](../interfaces/app.McpUiRequestDisplayModeRequest.html) for request structure

- [`McpUiHostContext`](../interfaces/app.McpUiHostContext.html) for checking availableDisplayModes

- Defined in [src/app.ts:959](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L959)

### `Protected`requestStream[](#requeststream)

- requestStream<[T](#requeststreamt) extends AnySchema>(
    request: [AppRequest](../types/types.AppRequest.html),
    resultSchema: [T](#requeststreamt),
    options?: RequestOptions,
): AsyncGenerator<ResponseMessage<SchemaOutput<[T](#requeststreamt)>>, void, void>[](#requeststream-1)
`Experimental`Sends a request and returns an AsyncGenerator that yields response messages.
The generator is guaranteed to end with either a 'result' or 'error' message.

#### Type Parameters

T extends AnySchema

### sendLog[](#sendlog)

- sendLog(
    params: {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        data: unknown;
        level: | "error"
        | "alert"
        | "debug"
        | "info"
        | "notice"
        | "warning"
        | "critical"
        | "emergency";
        logger?: string;
    },
): Promise<void>[](#sendlog-1)
Send log messages to the host for debugging and telemetry.

Logs are not added to the conversation but may be recorded by the host
for debugging purposes.

#### Parameters

params: {
    _meta?: {
        "io.modelcontextprotocol/related-task"?: { taskId: string };
        progressToken?: string | number;
        [key: string]: unknown;
    };
    data: unknown;
    level: | "error"
    | "alert"
    | "debug"
    | "info"
    | "notice"
    | "warning"
    | "critical"
    | "emergency";
    logger?: string;
}Log level and message

#### Returns Promise<void>

Promise that resolves when the log notification is sent

#### Example: Log app state for debugging[](#example-log-app-state-for-debugging)

```
`app.sendLog({
  level: "info",
  data: "Weather data refreshed",
  logger: "WeatherApp",
});
`Copy
```

- Defined in [src/app.ts:821](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L821)

### sendMessage[](#sendmessage)

- sendMessage(
    params: { content: ContentBlock[]; role: "user" },
    options?: RequestOptions,
): Promise<{ isError?: boolean; [key: string]: unknown }>[](#sendmessage-1)
Send a message to the host's chat interface.

Enables the app to add messages to the conversation thread. Useful for
user-initiated messages or app-to-conversation communication.

#### Parameters

params: { content: ContentBlock[]; role: "user" }Message role and content

##### content: ContentBlock[]

#### Description[](#description-3)

Message content blocks (text, image, etc.).

- ##### role: "user"

#### Description[](#description-4)

Message role, currently only "user" is supported.

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<{ isError?: boolean; [key: string]: unknown }>

Result with optional `isError` flag indicating host rejection

#### Throws[](#throws-6)

If the request times out or the connection is lost

#### Example: Send a text message from user interaction[](#example-send-a-text-message-from-user-interaction)

```
`try {
  const result = await app.sendMessage({
    role: "user",
    content: [{ type: "text", text: "Show me details for item #42" }],
  });
  if (result.isError) {
    console.error("Host rejected the message");
    // Handle rejection appropriately for your app
  }
} catch (error) {
  console.error("Failed to send message:", error);
  // Handle transport/protocol error
}
`Copy
```

#### Example: Send follow-up message after offloading large data to model context[](#example-send-follow-up-message-after-offloading-large-data-to-model-context)

```
`const markdown = `---
word-count: ${fullTranscript.split(/\s+/).length}
speaker-names: ${speakerNames.join(", ")}
---

${fullTranscript}`;

// Offload long transcript to model context
await app.updateModelContext({ content: [{ type: "text", text: markdown }] });

// Send brief trigger message
await app.sendMessage({
  role: "user",
  content: [{ type: "text", text: "Summarize the key points" }],
});
`Copy
```

#### See[](#see-16)

[`McpUiMessageRequest`](../interfaces/app.McpUiMessageRequest.html) for request structure

- Defined in [src/app.ts:791](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L791)

### sendSizeChanged[](#sendsizechanged)

- sendSizeChanged(params: { height?: number; width?: number }): Promise<void>[](#sendsizechanged-1)
Notify the host of UI size changes.

Apps can manually report size changes to help the host adjust the container.
If `autoResize` is enabled (default), this is called automatically.

#### Parameters

params: { height?: number; width?: number }New width and height in pixels

##### `Optional`height?: number

#### Description[](#description-5)

New height in pixels.

- ##### `Optional`width?: number

#### Description[](#description-6)

New width in pixels.

#### Returns Promise<void>

Promise that resolves when the notification is sent

#### Example: Manually notify host of size change[](#example-manually-notify-host-of-size-change)

```
`app.sendSizeChanged({
  width: 400,
  height: 600,
});
`Copy
```

#### See[](#see-17)

[`McpUiSizeChangedNotification`](../interfaces/app.McpUiSizeChangedNotification.html) for notification structure

- Defined in [src/app.ts:993](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L993)

### setNotificationHandler[](#setnotificationhandler)

- setNotificationHandler<[T](#setnotificationhandlert) extends AnyObjectSchema>(
    notificationSchema: [T](#setnotificationhandlert),
    handler: (notification: SchemaOutput<[T](#setnotificationhandlert)>) => void | Promise<void>,
): void[](#setnotificationhandler-1)
Registers a handler to invoke when this protocol object receives a notification with the given method.

Note that this will replace any previous notification handler for the same method.

#### Type Parameters

T extends AnyObjectSchema

### setRequestHandler[](#setrequesthandler)

- setRequestHandler<[T](#setrequesthandlert) extends AnyObjectSchema>(
    requestSchema: [T](#setrequesthandlert),
    handler: (
        request: SchemaOutput<[T](#setrequesthandlert)>,
        extra: RequestHandlerExtra<[AppRequest](../types/types.AppRequest.html), [AppNotification](../types/types.AppNotification.html)>,
    ) => [AppResult](../types/types.AppResult.html) | Promise<[AppResult](../types/types.AppResult.html)>,
): void[](#setrequesthandler-1)
Registers a handler to invoke when this protocol object receives a request with the given method.

Note that this will replace any previous request handler for the same method.

#### Type Parameters

T extends AnyObjectSchema

### setupSizeChangedNotifications[](#setupsizechangednotifications)

- setupSizeChangedNotifications(): () => void[](#setupsizechangednotifications-1)
Set up automatic size change notifications using ResizeObserver.

Observes both `document.documentElement` and `document.body` for size changes
and automatically sends `ui/notifications/size-changed` notifications to the host.
The notifications are debounced using requestAnimationFrame to avoid duplicates.

Note: This method is automatically called by `connect()` if the `autoResize`
option is true (default). You typically don't need to call this manually unless
you disabled autoResize and want to enable it later.

#### Returns () => void

Cleanup function to disconnect the observer

#### Example: Manual setup for custom scenarios[](#example-manual-setup-for-custom-scenarios)

```
`const app = new App(
  { name: "MyApp", version: "1.0.0" },
  {},
  { autoResize: false },
);
await app.connect(transport);

// Later, enable auto-resize manually
const cleanup = app.setupSizeChangedNotifications();

// Clean up when done
cleanup();
`Copy
```

Defined in [src/app.ts:1029](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L1029)

### updateModelContext[](#updatemodelcontext)

- updateModelContext(
    params: {
        content?: ContentBlock[];
        structuredContent?: Record<string, unknown>;
    },
    options?: RequestOptions,
): Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
    },
>[](#updatemodelcontext-1)
Update the host's model context with app state.

Context updates are intended to be available to the model in future
turns, without triggering an immediate model response (unlike [`sendMessage`](#sendmessage)).

The host will typically defer sending the context to the model until the
next user message — either from the actual user or via `sendMessage`. Only
the last update is sent; each call overwrites any previous context.

#### Parameters

params: { content?: ContentBlock[]; structuredContent?: Record<string, unknown> }Context content and/or structured content

##### `Optional`content?: ContentBlock[]

#### Description[](#description-7)

Context content blocks (text, image, etc.).

- ##### `Optional`structuredContent?: Record<string, unknown>

#### Description[](#description-8)

Structured content for machine-readable context data.

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
    },
>

Promise that resolves when the context update is acknowledged

#### Throws[](#throws-7)

If the host rejects the context update (e.g., unsupported content type)

#### Throws[](#throws-8)

If the request times out or the connection is lost

#### Example: Update model context with current app state[](#example-update-model-context-with-current-app-state)

```
`const markdown = `---
item-count: ${itemList.length}
total-cost: ${totalCost}
currency: ${currency}
---

User is viewing their shopping cart with ${itemList.length} items selected:

${itemList.map((item) => `- ${item}`).join("\n")}`;

await app.updateModelContext({
  content: [{ type: "text", text: markdown }],
});
`Copy
```

#### Example: Report runtime error to model[](#example-report-runtime-error-to-model)

```
`try {
  const _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // ... use _stream for transcription
} catch (err) {
  // Inform the model that the app is in a degraded state
  await app.updateModelContext({
    content: [
      {
        type: "text",
        text: "Error: transcription unavailable",
      },
    ],
  });
}
`Copy
```

- Defined in [src/app.ts:881](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L881)

