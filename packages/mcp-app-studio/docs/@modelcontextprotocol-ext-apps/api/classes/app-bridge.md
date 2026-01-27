# AppBridge

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

Host-side bridge for communicating with a single View ([`App`](app.App.html)).

`AppBridge` extends the MCP SDK's `Protocol` class and acts as a proxy between
the host application and a view running in an iframe. When an MCP client
is provided to the constructor, it automatically forwards MCP server capabilities
(tools, resources, prompts) to the view. It also handles the initialization
handshake.

## Architecture[](#architecture)

**View ↔ AppBridge ↔ Host ↔ MCP Server**

The bridge proxies requests from the view to the MCP server and forwards
responses back. It also sends host-initiated notifications like tool input
and results to the view.

## Lifecycle[](#lifecycle)

- **Create**: Instantiate `AppBridge` with MCP client and capabilities

- **Connect**: Call `connect()` with transport to establish communication

- **Wait for init**: View sends initialize request, bridge responds

- **Send data**: Call [`sendToolInput`](#sendtoolinput), [`sendToolResult`](#sendtoolresult), etc.

- **Teardown**: Call [`teardownResource`](#teardownresource) before unmounting iframe

#### Example: Basic usage[](#example-basic-usage)

```
`// Create MCP client for the server
const client = new Client({
  name: "MyHost",
  version: "1.0.0",
});
await client.connect(serverTransport);

// Create bridge for the View
const bridge = new AppBridge(
  client,
  { name: "MyHost", version: "1.0.0" },
  { openLinks: {}, serverTools: {}, logging: {} },
);

// Set up iframe and connect
const iframe = document.getElementById("app") as HTMLIFrameElement;
const transport = new PostMessageTransport(
  iframe.contentWindow!,
  iframe.contentWindow!,
);

bridge.oninitialized = () => {
  console.log("View initialized");
  // Now safe to send tool input
  bridge.sendToolInput({ arguments: { location: "NYC" } });
};

await bridge.connect(transport);
`Copy
```

##### Index

### Constructors

[constructor](#constructor)

### constructor[](#constructor)

- new AppBridge(
    _client:
        | Client<
            {
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
            {
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
            {
                _meta?: {
                    "io.modelcontextprotocol/related-task"?: { taskId: string };
                    progressToken?: string | number;
                    [key: string]: unknown;
                };
                [key: string]: unknown;
            },
        >
        | null,
    _hostInfo: {
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
    _capabilities: [McpUiHostCapabilities](../interfaces/app.McpUiHostCapabilities.html),
    options?: [HostOptions](../types/app-bridge.HostOptions.html),
): [AppBridge]()[](#constructorappbridge)
Create a new AppBridge instance.

#### Parameters

_client: 
    | Client<
        {
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
        {
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
        {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            [key: string]: unknown;
        },
    >
    | nullMCP client connected to the server, or `null`. When provided,
[`connect`](#connect) will automatically set up forwarding of MCP requests/notifications
between the View and the server. When `null`, you must register handlers
manually using the [`oncalltool`](#oncalltool), [`onlistresources`](#onlistresources), etc. setters.

- _hostInfo: {
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
}Host application identification (name and version)

- _capabilities: [McpUiHostCapabilities](../interfaces/app.McpUiHostCapabilities.html)Features and capabilities the host supports

- `Optional`options: [HostOptions](../types/app-bridge.HostOptions.html)Configuration options (inherited from Protocol)

#### Returns [AppBridge]()

#### Example: With MCP client (automatic forwarding)[](#example-with-mcp-client-automatic-forwarding)

```
`const bridge = new AppBridge(
  mcpClient,
  { name: "MyHost", version: "1.0.0" },
  { openLinks: {}, serverTools: {}, logging: {} },
);
`Copy
```

#### Example: Without MCP client (manual handlers)[](#example-without-mcp-client-manual-handlers)

```
`const bridge = new AppBridge(
  null,
  { name: "MyHost", version: "1.0.0" },
  { openLinks: {}, serverTools: {}, logging: {} },
);
bridge.oncalltool = async (params, extra) => {
  // Handle tool calls manually
  return { content: [] };
};
`Copy
```

Overrides Protocol<
  AppRequest,
  AppNotification,
  AppResult
>.constructor

- Defined in [src/app-bridge.ts:291](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L291)

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

### `Optional`onping[](#onping)

onping?: (
    params:
        | {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
        }
        | undefined,
    extra: RequestHandlerExtra,
) => void
Optional handler for ping requests from the view.

The View can send standard MCP `ping` requests to verify the connection
is alive. The [`AppBridge`](#) automatically responds with an empty object, but this
handler allows the host to observe or log ping activity.

Unlike the other handlers which use setters, this is a direct property
assignment. It is optional; if not set, pings are still handled automatically.

#### Type Declaration

- 
(
    params:
        | {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
        }
        | undefined,
    extra: RequestHandlerExtra,
): void
- #### Parameters

params: 
    | {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
    }
    | undefinedEmpty params object from the ping request

- extra: RequestHandlerExtraRequest metadata (abort signal, session info)

#### Returns void

#### Example[](#example)

```
`bridge.onping = (params, extra) => {
  console.log("Received ping from view");
};
`Copy
```

- Defined in [src/app-bridge.ts:385](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L385)

### sendResourceTeardown[](#sendresourceteardown)

sendResourceTeardown: (
    params: {},
    options?: RequestOptions,
) => Promise<Record<string, unknown>> = ...
#### Type Declaration

- 
(params: {}, options?: RequestOptions): Promise<Record<string, unknown>>
- Request graceful shutdown of the view.

The host MUST send this request before tearing down the UI resource (before
unmounting the iframe). This gives the view an opportunity to save state,
cancel pending operations, or show confirmation dialogs.

The host SHOULD wait for the response before unmounting to prevent data loss.

#### Parameters

params: {}Empty params object

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<Record<string, unknown>>

Promise resolving when view confirms readiness for teardown

#### Example[](#example-1)

```
`try {
  await bridge.teardownResource({});
  // View is ready, safe to unmount iframe
  iframe.remove();
} catch (error) {
  console.error("Teardown failed:", error);
}
`Copy
```

#### Deprecated[](#deprecated)

Use [`teardownResource`](#teardownresource) instead

- Defined in [src/app-bridge.ts:1326](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1326)

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
Register a handler for tool call requests from the view.

The view sends `tools/call` requests to execute MCP server tools. This
handler allows the host to intercept and process these requests, typically
by forwarding them to the MCP server.

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
>Handler that receives tool call params and returns a
`CallToolResult`

`params` - Tool call parameters (name and arguments)

- `extra` - Request metadata (abort signal, session info)

#### Returns void

#### Example[](#example-2)

```
`bridge.oncalltool = async (params, extra) => {
  return mcpClient.request(
    { method: "tools/call", params },
    CallToolResultSchema,
    { signal: extra.signal },
  );
};
`Copy
```

#### See[](#see)

- `CallToolRequest` from @modelcontextprotocol/sdk for the request type

- `CallToolResult` from @modelcontextprotocol/sdk for the result type

- Defined in [src/app-bridge.ts:737](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L737)

### oninitialized[](#oninitialized)

- set oninitialized(callback: (params: {} | undefined) => void): void
Called when the view completes initialization.

Set this callback to be notified when the view has finished its
initialization handshake and is ready to receive tool input and other data.

#### Parameters

callback: (params: {} | undefined) => void

#### Returns void

#### Example[](#example-3)

```
`bridge.oninitialized = () => {
  console.log("View ready");
  bridge.sendToolInput({ arguments: toolArgs });
};
`Copy
```

#### See[](#see-1)

- [`McpUiInitializedNotification`](../interfaces/app.McpUiInitializedNotification.html) for the notification type

- [`sendToolInput`](#sendtoolinput) for sending tool arguments to the View

- Defined in [src/app-bridge.ts:475](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L475)

### onlistprompts[](#onlistprompts)

- set onlistprompts(
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
    ) => Promise<
        {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            nextCursor?: string;
            prompts: {
                _meta?: { [key: string]: unknown };
                arguments?: { description?: string; name: string; required?: boolean }[];
                description?: string;
                icons?: {
                    mimeType?: string;
                    sizes?: string[];
                    src: string;
                    theme?: "light" | "dark";
                }[];
                name: string;
                title?: string;
            }[];
            [key: string]: unknown;
        },
    >,
): void
Register a handler for list prompts requests from the view.

The view sends `prompts/list` requests to enumerate available MCP
prompts. This handler allows the host to intercept and process these
requests, typically by forwarding them to the MCP server.

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
) => Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        nextCursor?: string;
        prompts: {
            _meta?: { [key: string]: unknown };
            arguments?: { description?: string; name: string; required?: boolean }[];
            description?: string;
            icons?: {
                mimeType?: string;
                sizes?: string[];
                src: string;
                theme?: "light" | "dark";
            }[];
            name: string;
            title?: string;
        }[];
        [key: string]: unknown;
    },
>Handler that receives list params and returns a
`ListPromptsResult`

`params` - Request params (may include cursor for pagination)

- `extra` - Request metadata (abort signal, session info)

#### Returns void

#### Example[](#example-4)

```
`bridge.onlistprompts = async (params, extra) => {
  return mcpClient.request(
    { method: "prompts/list", params },
    ListPromptsResultSchema,
    { signal: extra.signal },
  );
};
`Copy
```

#### See[](#see-2)

- `ListPromptsRequest` from @modelcontextprotocol/sdk for the request type

- `ListPromptsResult` from @modelcontextprotocol/sdk for the result type

- Defined in [src/app-bridge.ts:948](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L948)

### onlistresources[](#onlistresources)

- set onlistresources(
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
    ) => Promise<
        {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            nextCursor?: string;
            resources: {
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
                uri: string;
            }[];
            [key: string]: unknown;
        },
    >,
): void
Register a handler for list resources requests from the view.

The view sends `resources/list` requests to enumerate available MCP
resources. This handler allows the host to intercept and process these
requests, typically by forwarding them to the MCP server.

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
) => Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        nextCursor?: string;
        resources: {
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
            uri: string;
        }[];
        [key: string]: unknown;
    },
>Handler that receives list params and returns a
`ListResourcesResult`

`params` - Request params (may include cursor for pagination)

- `extra` - Request metadata (abort signal, session info)

#### Returns void

#### Example[](#example-5)

```
`bridge.onlistresources = async (params, extra) => {
  return mcpClient.request(
    { method: "resources/list", params },
    ListResourcesResultSchema,
    { signal: extra.signal },
  );
};
`Copy
```

#### See[](#see-3)

- `ListResourcesRequest` from @modelcontextprotocol/sdk for the request type

- `ListResourcesResult` from @modelcontextprotocol/sdk for the result type

- Defined in [src/app-bridge.ts:800](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L800)

### onlistresourcetemplates[](#onlistresourcetemplates)

- set onlistresourcetemplates(
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
    ) => Promise<
        {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            nextCursor?: string;
            resourceTemplates: {
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
                uriTemplate: string;
            }[];
            [key: string]: unknown;
        },
    >,
): void
Register a handler for list resource templates requests from the view.

The view sends `resources/templates/list` requests to enumerate available
MCP resource templates. This handler allows the host to intercept and process
these requests, typically by forwarding them to the MCP server.

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
) => Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        nextCursor?: string;
        resourceTemplates: {
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
            uriTemplate: string;
        }[];
        [key: string]: unknown;
    },
>Handler that receives list params and returns a
`ListResourceTemplatesResult`

`params` - Request params (may include cursor for pagination)

- `extra` - Request metadata (abort signal, session info)

#### Returns void

#### Example[](#example-6)

```
`bridge.onlistresourcetemplates = async (params, extra) => {
  return mcpClient.request(
    { method: "resources/templates/list", params },
    ListResourceTemplatesResultSchema,
    { signal: extra.signal }
  );
};
`Copy
```

#### See[](#see-4)

- `ListResourceTemplatesRequest` from @modelcontextprotocol/sdk for the request type

- `ListResourceTemplatesResult` from @modelcontextprotocol/sdk for the result type

- Defined in [src/app-bridge.ts:840](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L840)

### onloggingmessage[](#onloggingmessage)

- set onloggingmessage(
    callback: (
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
    ) => void,
): void
Register a handler for logging messages from the view.

The view sends standard MCP `notifications/message` (logging) notifications
to report debugging information, errors, warnings, and other telemetry to the
host. The host can display these in a console, log them to a file, or send
them to a monitoring service.

This uses the standard MCP logging notification format, not a UI-specific
message type.

#### Parameters

callback: (
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
) => voidHandler that receives logging params

`params.level` - Log level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency"

- `params.logger` - Optional logger name/identifier

- `params.data` - Log message and optional structured data

#### Returns void

#### Example[](#example-7)

```
`bridge.onloggingmessage = ({ level, logger, data }) => {
  console[level === "error" ? "error" : "log"](
    `[${logger ?? "View"}] ${level.toUpperCase()}:`,
    data,
  );
};
`Copy
```

- Defined in [src/app-bridge.ts:660](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L660)

### onmessage[](#onmessage)

- set onmessage(
    callback: (
        params: { content: ContentBlock[]; role: "user" },
        extra: RequestHandlerExtra,
    ) => Promise<[McpUiMessageResult](../interfaces/app.McpUiMessageResult.html)>,
): void
Register a handler for message requests from the view.

The view sends `ui/message` requests when it wants to add a message to
the host's chat interface. This enables interactive apps to communicate with
the user through the conversation thread.

The handler should process the message (add it to the chat) and return a
result indicating success or failure. For security, the host should NOT
return conversation content or follow-up results to prevent information
leakage.

#### Parameters

callback: (
    params: { content: ContentBlock[]; role: "user" },
    extra: RequestHandlerExtra,
) => Promise<[McpUiMessageResult](../interfaces/app.McpUiMessageResult.html)>Handler that receives message params and returns a result

`params.role` - Message role (currently only "user" is supported)

- `params.content` - Message content blocks (text, image, etc.)

- `extra` - Request metadata (abort signal, session info)

- Returns: `Promise<McpUiMessageResult>` with optional `isError` flag

#### Returns void

#### Example[](#example-8)

```
`bridge.onmessage = async ({ role, content }, extra) => {
  try {
    await chatManager.addMessage({ role, content, source: "app" });
    return {}; // Success
  } catch (error) {
    console.error("Failed to add message:", error);
    return { isError: true };
  }
};
`Copy
```

#### See[](#see-5)

- [`McpUiMessageRequest`](../interfaces/app.McpUiMessageRequest.html) for the request type

- [`McpUiMessageResult`](../interfaces/app.McpUiMessageResult.html) for the result type

- Defined in [src/app-bridge.ts:517](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L517)

### onopenlink[](#onopenlink)

- set onopenlink(
    callback: (
        params: { url: string },
        extra: RequestHandlerExtra,
    ) => Promise<[McpUiOpenLinkResult](../interfaces/app.McpUiOpenLinkResult.html)>,
): void
Register a handler for external link requests from the view.

The view sends `ui/open-link` requests when it wants to open an external
URL in the host's default browser. The handler should validate the URL and
open it according to the host's security policy and user preferences.

The host MAY:

Show a confirmation dialog before opening

- Block URLs based on a security policy or allowlist

- Log the request for audit purposes

- Reject the request entirely

#### Parameters

- callback: (
    params: { url: string },
    extra: RequestHandlerExtra,
) => Promise<[McpUiOpenLinkResult](../interfaces/app.McpUiOpenLinkResult.html)>Handler that receives URL params and returns a result

`params.url` - URL to open in the host's browser

- `extra` - Request metadata (abort signal, session info)

- Returns: `Promise<McpUiOpenLinkResult>` with optional `isError` flag

#### Returns void

#### Example[](#example-9)

```
`bridge.onopenlink = async ({ url }, extra) => {
  if (!isAllowedDomain(url)) {
    console.warn("Blocked external link:", url);
    return { isError: true };
  }

  const confirmed = await showDialog({
    message: `Open external link?\n${url}`,
    buttons: ["Open", "Cancel"],
  });

  if (confirmed) {
    window.open(url, "_blank", "noopener,noreferrer");
    return {};
  }

  return { isError: true };
};
`Copy
```

#### See[](#see-6)

- [`McpUiOpenLinkRequest`](../interfaces/app.McpUiOpenLinkRequest.html) for the request type

- [`McpUiOpenLinkResult`](../interfaces/app.McpUiOpenLinkResult.html) for the result type

- Defined in [src/app-bridge.ts:574](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L574)

### onreadresource[](#onreadresource)

- set onreadresource(
    callback: (
        params: {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            uri: string;
        },
        extra: RequestHandlerExtra,
    ) => Promise<
        {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
            contents: (
                | {
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
                }
            )[];
            [key: string]: unknown;
        },
    >,
): void
Register a handler for read resource requests from the view.

The view sends `resources/read` requests to retrieve the contents of an
MCP resource. This handler allows the host to intercept and process these
requests, typically by forwarding them to the MCP server.

#### Parameters

callback: (
    params: {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        uri: string;
    },
    extra: RequestHandlerExtra,
) => Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
        contents: (
            | {
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
            }
        )[];
        [key: string]: unknown;
    },
>Handler that receives read params and returns a
`ReadResourceResult`

`params` - Read parameters including the resource URI

- `extra` - Request metadata (abort signal, session info)

#### Returns void

#### Example[](#example-10)

```
`bridge.onreadresource = async (params, extra) => {
  return mcpClient.request(
    { method: "resources/read", params },
    ReadResourceResultSchema,
    { signal: extra.signal },
  );
};
`Copy
```

#### See[](#see-7)

- `ReadResourceRequest` from @modelcontextprotocol/sdk for the request type

- `ReadResourceResult` from @modelcontextprotocol/sdk for the result type

- Defined in [src/app-bridge.ts:880](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L880)

### onrequestdisplaymode[](#onrequestdisplaymode)

- set onrequestdisplaymode(
    callback: (
        params: { mode: [McpUiDisplayMode](../types/app.McpUiDisplayMode.html) },
        extra: RequestHandlerExtra,
    ) => Promise<[McpUiRequestDisplayModeResult](../interfaces/app.McpUiRequestDisplayModeResult.html)>,
): void
Register a handler for display mode change requests from the view.

The view sends `ui/request-display-mode` requests when it wants to change
its display mode (e.g., from "inline" to "fullscreen"). The handler should
check if the requested mode is in `availableDisplayModes` from the host context,
update the display mode if supported, and return the actual mode that was set.

If the requested mode is not available, the handler should return the current
display mode instead.

By default, `AppBridge` returns the current `displayMode` from host context (or "inline").
Setting this property replaces that default behavior.

#### Parameters

callback: (
    params: { mode: [McpUiDisplayMode](../types/app.McpUiDisplayMode.html) },
    extra: RequestHandlerExtra,
) => Promise<[McpUiRequestDisplayModeResult](../interfaces/app.McpUiRequestDisplayModeResult.html)>Handler that receives the requested mode and returns the actual mode set

`params.mode` - The display mode being requested ("inline" | "fullscreen" | "pip")

- `extra` - Request metadata (abort signal, session info)

- Returns: `Promise<McpUiRequestDisplayModeResult>` with the actual mode set

#### Returns void

#### Example[](#example-11)

```
`bridge.onrequestdisplaymode = async ({ mode }, extra) => {
  if (availableDisplayModes.includes(mode)) {
    currentDisplayMode = mode;
  }
  return { mode: currentDisplayMode };
};
`Copy
```

#### See[](#see-8)

- [`McpUiRequestDisplayModeRequest`](../interfaces/app.McpUiRequestDisplayModeRequest.html) for the request type

- [`McpUiRequestDisplayModeResult`](../interfaces/app.McpUiRequestDisplayModeResult.html) for the result type

- Defined in [src/app-bridge.ts:620](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L620)

### onsandboxready[](#onsandboxready)

- set onsandboxready(callback: (params: {}) => void): void
`Internal`Register a handler for sandbox proxy ready notifications.

This is an internal callback used by web-based hosts implementing the
double-iframe sandbox architecture. The sandbox proxy sends
`ui/notifications/sandbox-proxy-ready` after it loads and is ready to receive
HTML content.

When this fires, the host should call [`sendSandboxResourceReady`](#sendsandboxresourceready) with
the HTML content to load into the inner sandboxed iframe.

#### Parameters

callback: (params: {}) => void

#### Returns void

#### Example[](#example-12)

```
`bridge.onsandboxready = async () => {
  const resource = await mcpClient.request(
    { method: "resources/read", params: { uri: "ui://my-app" } },
    ReadResourceResultSchema
  );

  bridge.sendSandboxResourceReady({
    html: resource.contents[0].text,
    sandbox: "allow-scripts"
  });
};
`Copy
```

#### See[](#see-9)

- [`McpUiSandboxProxyReadyNotification`](../interfaces/app.McpUiSandboxProxyReadyNotification.html) for the notification type

- [`sendSandboxResourceReady`](#sendsandboxresourceready) for sending content to the sandbox

- Defined in [src/app-bridge.ts:450](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L450)

### onsizechange[](#onsizechange)

- set onsizechange(
    callback: (params: { height?: number; width?: number }) => void,
): void
Register a handler for size change notifications from the view.

The view sends `ui/notifications/size-changed` when its rendered content
size changes, typically via `ResizeObserver`. Set this callback to dynamically
adjust the iframe container dimensions based on the view's content.

Note: This is for View → Host communication. To notify the View of
host container dimension changes, use [`setHostContext`](#sethostcontext).

#### Parameters

callback: (params: { height?: number; width?: number }) => void

#### Returns void

#### Example[](#example-13)

```
`bridge.onsizechange = ({ width, height }) => {
  if (width != null) {
    iframe.style.width = `${width}px`;
  }
  if (height != null) {
    iframe.style.height = `${height}px`;
  }
};
`Copy
```

#### See[](#see-10)

- [`McpUiSizeChangedNotification`](../interfaces/app.McpUiSizeChangedNotification.html) for the notification type

- [`App.sendSizeChanged`](app.App.html#sendsizechanged) - the View method that sends these notifications

- Defined in [src/app-bridge.ts:412](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L412)

### onupdatemodelcontext[](#onupdatemodelcontext)

- set onupdatemodelcontext(
    callback: (
        params: {
            content?: ContentBlock[];
            structuredContent?: Record<string, unknown>;
        },
        extra: RequestHandlerExtra,
    ) => Promise<
        {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
        },
    >,
): void
Register a handler for model context updates from the view.

The view sends `ui/update-model-context` requests to update the Host's
model context. Each request overwrites the previous context stored by the view.
Unlike logging messages, context updates are intended to be available to
the model in future turns. Unlike messages, context updates do not trigger follow-ups.

The host will typically defer sending the context to the model until the
next user message (including `ui/message`), and will only send the last
update received.

#### Parameters

callback: (
    params: {
        content?: ContentBlock[];
        structuredContent?: Record<string, unknown>;
    },
    extra: RequestHandlerExtra,
) => Promise<
    {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
    },
>

#### Returns void

#### Example[](#example-14)

```
`bridge.onupdatemodelcontext = async (
  { content, structuredContent },
  extra,
) => {
  // Store the context snapshot for inclusion in the next model request
  modelContextManager.update({ content, structuredContent });
  return {};
};
`Copy
```

#### See[](#see-11)

[`McpUiUpdateModelContextRequest`](../interfaces/app.McpUiUpdateModelContextRequest.html) for the request type

- Defined in [src/app-bridge.ts:697](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L697)

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
`Internal`Verify that the guest supports the capability required for the given request method.

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

- Defined in [src/app-bridge.ts:989](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L989)

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
`Internal`Verify that the host supports the capability required for the given notification method.

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

- Defined in [src/app-bridge.ts:1005](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1005)

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
`Internal`Verify that a request handler is registered and supported for the given method.

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

- Defined in [src/app-bridge.ts:997](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L997)

### `Protected`assertTaskCapability[](#asserttaskcapability)

- assertTaskCapability(_method: string): void[](#asserttaskcapability-1)
`Internal`Verify that task creation is supported for the given request method.

#### Parameters

_method: string

#### Returns void

Overrides Protocol.assertTaskCapability

- Defined in [src/app-bridge.ts:1013](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1013)

### `Protected`assertTaskHandlerCapability[](#asserttaskhandlercapability)

- assertTaskHandlerCapability(_method: string): void[](#asserttaskhandlercapability-1)
`Internal`Verify that task handler is supported for the given method.

#### Parameters

_method: string

#### Returns void

Overrides Protocol.assertTaskHandlerCapability

- Defined in [src/app-bridge.ts:1021](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1021)

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

- connect(transport: Transport): Promise<void>[](#connect-1)
Connect to the view via transport and optionally set up message forwarding.

This method establishes the transport connection. If an MCP client was passed
to the constructor, it also automatically sets up request/notification forwarding
based on the MCP server's capabilities, proxying the following to the view:

Tools (tools/call, notifications/tools/list_changed)

- Resources (resources/list, resources/read, resources/templates/list, notifications/resources/list_changed)

- Prompts (prompts/list, notifications/prompts/list_changed)

If no client was passed to the constructor, no automatic forwarding is set up
and you must register handlers manually using the [`oncalltool`](#oncalltool), [`onlistresources`](#onlistresources),
etc. setters.

After calling connect, wait for the [`oninitialized`](#oninitialized) callback before sending
tool input and other data to the View.

#### Parameters

- transport: TransportTransport layer (typically [`PostMessageTransport`](message-transport.PostMessageTransport.html))

#### Returns Promise<void>

Promise resolving when connection is established

#### Throws[](#throws)

If a client was passed but server capabilities are not available.
This occurs when connect() is called before the MCP client has completed its
initialization with the server. Ensure `await client.connect()` completes
before calling `bridge.connect()`.

#### Example: With MCP client (automatic forwarding)[](#example-with-mcp-client-automatic-forwarding-1)

```
`const bridge = new AppBridge(mcpClient, hostInfo, capabilities);
const transport = new PostMessageTransport(
  iframe.contentWindow!,
  iframe.contentWindow!,
);

bridge.oninitialized = () => {
  console.log("View ready");
  bridge.sendToolInput({ arguments: toolArgs });
};

await bridge.connect(transport);
`Copy
```

#### Example: Without MCP client (manual handlers)[](#example-without-mcp-client-manual-handlers-1)

```
`const bridge = new AppBridge(null, hostInfo, capabilities);

// Register handlers manually
bridge.oncalltool = async (params, extra) => {
  // Custom tool call handling
  return { content: [] };
};

await bridge.connect(transport);
`Copy
```

Overrides Protocol.connect

- Defined in [src/app-bridge.ts:1382](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1382)

### getAppCapabilities[](#getappcapabilities)

- getAppCapabilities(): [McpUiAppCapabilities](../interfaces/app.McpUiAppCapabilities.html) | undefined[](#getappcapabilities-1)
Get the view's capabilities discovered during initialization.

Returns the capabilities that the view advertised during its
initialization request. Returns `undefined` if called before
initialization completes.

#### Returns [McpUiAppCapabilities](../interfaces/app.McpUiAppCapabilities.html) | undefined

view capabilities, or `undefined` if not yet initialized

#### Example: Check view capabilities after initialization[](#example-check-view-capabilities-after-initialization)

```
`bridge.oninitialized = () => {
  const caps = bridge.getAppCapabilities();
  if (caps?.tools) {
    console.log("View provides tools");
  }
};
`Copy
```

#### See[](#see-12)

[`McpUiAppCapabilities`](../interfaces/app.McpUiAppCapabilities.html) for the capabilities structure

Defined in [src/app-bridge.ts:339](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L339)

### getAppVersion[](#getappversion)

- getAppVersion(): | {
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
| undefined[](#getappversion-1)
Get the view's implementation info discovered during initialization.

Returns the view's name and version as provided in its initialization
request. Returns `undefined` if called before initialization completes.

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

view implementation info, or `undefined` if not yet initialized

#### Example: Log view information after initialization[](#example-log-view-information-after-initialization)

```
`bridge.oninitialized = () => {
  const appInfo = bridge.getAppVersion();
  if (appInfo) {
    console.log(`View: ${appInfo.name} v${appInfo.version}`);
  }
};
`Copy
```

Defined in [src/app-bridge.ts:361](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L361)

### getCapabilities[](#getcapabilities)

- getCapabilities(): [McpUiHostCapabilities](../interfaces/app.McpUiHostCapabilities.html)[](#getcapabilities-1)
Get the host capabilities passed to the constructor.

#### Returns [McpUiHostCapabilities](../interfaces/app.McpUiHostCapabilities.html)

Host capabilities object

#### See[](#see-13)

[`McpUiHostCapabilities`](../interfaces/app.McpUiHostCapabilities.html) for the capabilities structure

Defined in [src/app-bridge.ts:1032](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1032)

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
    resultSchema: [T](app.App.html#gettaskresultt),
    options?: RequestOptions,
): Promise<SchemaOutput<[T](app.App.html#gettaskresultt)>>[](#gettaskresult-1)
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
    resultSchema: [T](app.App.html#requestt),
    options?: RequestOptions,
): Promise<SchemaOutput<[T](app.App.html#requestt)>>[](#request-1)
Sends a request and waits for a response.

Do not use this method to emit notifications! Use notification() instead.

#### Type Parameters

T extends AnySchema

### `Protected`requestStream[](#requeststream)

- requestStream<[T](#requeststreamt) extends AnySchema>(
    request: [AppRequest](../types/types.AppRequest.html),
    resultSchema: [T](app.App.html#requeststreamt),
    options?: RequestOptions,
): AsyncGenerator<ResponseMessage<SchemaOutput<[T](app.App.html#requeststreamt)>>, void, void>[](#requeststream-1)
`Experimental`Sends a request and returns an AsyncGenerator that yields response messages.
The generator is guaranteed to end with either a 'result' or 'error' message.

#### Type Parameters

T extends AnySchema

### sendHostContextChange[](#sendhostcontextchange)

- sendHostContextChange(params: [McpUiHostContext](../interfaces/app.McpUiHostContext.html)): void | Promise<void>[](#sendhostcontextchange-1)
Low-level method to notify the view of host context changes.

Most hosts should use [`setHostContext`](#sethostcontext) instead, which automatically
detects changes and calls this method with only the modified fields.
Use this directly only when you need fine-grained control over change detection.

#### Parameters

params: [McpUiHostContext](../interfaces/app.McpUiHostContext.html)The context fields that have changed (partial update)

#### Returns void | Promise<void>

- Defined in [src/app-bridge.ts:1123](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1123)

### sendPromptListChanged[](#sendpromptlistchanged)

- sendPromptListChanged(
    params?:
        | {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
        }
        | undefined,
): Promise<void>[](#sendpromptlistchanged-1)
Notify the view that the MCP server's prompt list has changed.

The host sends `notifications/prompts/list_changed` to the view when it
receives this notification from the MCP server. This allows the view
to refresh its prompt cache or UI accordingly.

#### Parameters

params: 
    | {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
    }
    | undefined = {}Optional notification params (typically empty)

#### Returns Promise<void>

#### Example[](#example-16)

```
`// In your MCP client notification handler:
mcpClient.setNotificationHandler(PromptListChangedNotificationSchema, () => {
  bridge.sendPromptListChanged();
});
`Copy
```

#### See[](#see-14)

`PromptListChangedNotification` from @modelcontextprotocol/sdk for the notification type

- Defined in [src/app-bridge.ts:978](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L978)

### sendResourceListChanged[](#sendresourcelistchanged)

- sendResourceListChanged(
    params?:
        | {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
        }
        | undefined,
): Promise<void>[](#sendresourcelistchanged-1)
Notify the view that the MCP server's resource list has changed.

The host sends `notifications/resources/list_changed` to the view when it
receives this notification from the MCP server. This allows the view
to refresh its resource cache or UI accordingly.

#### Parameters

params: 
    | {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
    }
    | undefined = {}Optional notification params (typically empty)

#### Returns Promise<void>

#### Example[](#example-17)

```
`// In your MCP client notification handler:
mcpClient.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
  bridge.sendResourceListChanged();
});
`Copy
```

#### See[](#see-15)

`ResourceListChangedNotification` from @modelcontextprotocol/sdk for the notification type

- Defined in [src/app-bridge.ts:913](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L913)

### sendSandboxResourceReady[](#sendsandboxresourceready)

- sendSandboxResourceReady(
    params: {
        csp?: [McpUiResourceCsp](../interfaces/app.McpUiResourceCsp.html);
        html: string;
        permissions?: [McpUiResourcePermissions](../interfaces/app.McpUiResourcePermissions.html);
        sandbox?: string;
    },
): Promise<void>[](#sendsandboxresourceready-1)
`Internal`Send HTML resource to the sandbox proxy for secure loading.

This is an internal method used by web-based hosts implementing the
double-iframe sandbox architecture. After the sandbox proxy signals readiness
via `ui/notifications/sandbox-proxy-ready`, the host sends this notification
with the HTML content to load.

#### Parameters

params: {
    csp?: [McpUiResourceCsp](../interfaces/app.McpUiResourceCsp.html);
    html: string;
    permissions?: [McpUiResourcePermissions](../interfaces/app.McpUiResourcePermissions.html);
    sandbox?: string;
}HTML content and sandbox configuration:

`html`: The HTML content to load into the sandboxed iframe

- `sandbox`: Optional sandbox attribute value (e.g., "allow-scripts")

- ##### `Optional`csp?: [McpUiResourceCsp](../interfaces/app.McpUiResourceCsp.html)

#### Description[](#description)

CSP configuration from resource metadata.

- ##### html: string

#### Description[](#description-1)

HTML content to load into the inner iframe.

- ##### `Optional`permissions?: [McpUiResourcePermissions](../interfaces/app.McpUiResourcePermissions.html)

#### Description[](#description-2)

Sandbox permissions from resource metadata.

- ##### `Optional`sandbox?: string

#### Description[](#description-3)

Optional override for the inner iframe's sandbox attribute.

#### Returns Promise<void>

#### See[](#see-16)

[`onsandboxready`](#onsandboxready) for handling the sandbox proxy ready notification

- Defined in [src/app-bridge.ts:1278](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1278)

### sendToolCancelled[](#sendtoolcancelled)

- sendToolCancelled(params: { reason?: string }): Promise<void>[](#sendtoolcancelled-1)
Notify the view that tool execution was cancelled.

The host MUST send this notification if tool execution was cancelled for any
reason, including user action, sampling error, classifier intervention, or
any other interruption. This allows the view to update its state and
display appropriate feedback to the user.

#### Parameters

params: { reason?: string }Cancellation details object

`reason`: Human-readable explanation for why the tool was cancelled

- ##### `Optional`reason?: string

#### Description[](#description-4)

Optional reason for the cancellation (e.g., "user action", "timeout").

#### Returns Promise<void>

#### Example: User-initiated cancellation[](#example-user-initiated-cancellation)

```
`// User clicked "Cancel" button
bridge.sendToolCancelled({ reason: "User cancelled the operation" });
`Copy
```

#### Example: System-level cancellation[](#example-system-level-cancellation)

```
`// Sampling error or timeout
bridge.sendToolCancelled({ reason: "Request timeout after 30 seconds" });

// Classifier intervention
bridge.sendToolCancelled({ reason: "Content policy violation detected" });
`Copy
```

#### See[](#see-17)

- [`McpUiToolCancelledNotification`](../interfaces/app.McpUiToolCancelledNotification.html) for the notification type

- [`sendToolResult`](#sendtoolresult) for sending successful results

- [`sendToolInput`](#sendtoolinput) for sending tool arguments

- Defined in [src/app-bridge.ts:1256](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1256)

### sendToolInput[](#sendtoolinput)

- sendToolInput(params: { arguments?: Record<string, unknown> }): Promise<void>[](#sendtoolinput-1)
Send complete tool arguments to the view.

The host MUST send this notification after the View completes initialization
(after [`oninitialized`](#oninitialized) callback fires) and complete tool arguments become available.
This notification is sent exactly once and is required before [`sendToolResult`](#sendtoolresult).

#### Parameters

params: { arguments?: Record<string, unknown> }Complete tool call arguments

##### `Optional`arguments?: Record<string, unknown>

#### Description[](#description-5)

Complete tool call arguments as key-value pairs.

#### Returns Promise<void>

#### Example[](#example-18)

```
`bridge.oninitialized = () => {
  bridge.sendToolInput({
    arguments: { location: "New York", units: "metric" },
  });
};
`Copy
```

#### See[](#see-18)

- [`McpUiToolInputNotification`](../interfaces/app.McpUiToolInputNotification.html) for the notification type

- [`oninitialized`](#oninitialized) for the initialization callback

- [`sendToolResult`](#sendtoolresult) for sending results after execution

- Defined in [src/app-bridge.ts:1154](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1154)

### sendToolInputPartial[](#sendtoolinputpartial)

- sendToolInputPartial(
    params: { arguments?: Record<string, unknown> },
): Promise<void>[](#sendtoolinputpartial-1)
Send streaming partial tool arguments to the view.

The host MAY send this notification zero or more times while tool arguments
are being streamed, before [`sendToolInput`](#sendtoolinput) is called with complete
arguments. This enables progressive rendering of tool arguments in the
view.

The arguments represent best-effort recovery of incomplete JSON. views
SHOULD handle missing or changing fields gracefully between notifications.

#### Parameters

params: { arguments?: Record<string, unknown> }Partial tool call arguments (may be incomplete)

##### `Optional`arguments?: Record<string, unknown>

#### Description[](#description-6)

Partial tool call arguments (incomplete, may change).

#### Returns Promise<void>

#### Example: Stream partial arguments as they arrive[](#example-stream-partial-arguments-as-they-arrive)

```
`// As streaming progresses...
bridge.sendToolInputPartial({ arguments: { loc: "N" } });
bridge.sendToolInputPartial({ arguments: { location: "New" } });
bridge.sendToolInputPartial({ arguments: { location: "New York" } });

// When complete, send final input
bridge.sendToolInput({
  arguments: { location: "New York", units: "metric" },
});
`Copy
```

#### See[](#see-19)

- [`McpUiToolInputPartialNotification`](../interfaces/app.McpUiToolInputPartialNotification.html) for the notification type

- [`sendToolInput`](#sendtoolinput) for sending complete arguments

- Defined in [src/app-bridge.ts:1190](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1190)

### sendToolListChanged[](#sendtoollistchanged)

- sendToolListChanged(
    params?:
        | {
            _meta?: {
                "io.modelcontextprotocol/related-task"?: { taskId: string };
                progressToken?: string | number;
                [key: string]: unknown;
            };
        }
        | undefined,
): Promise<void>[](#sendtoollistchanged-1)
Notify the view that the MCP server's tool list has changed.

The host sends `notifications/tools/list_changed` to the view when it
receives this notification from the MCP server. This allows the view
to refresh its tool cache or UI accordingly.

#### Parameters

params: 
    | {
        _meta?: {
            "io.modelcontextprotocol/related-task"?: { taskId: string };
            progressToken?: string | number;
            [key: string]: unknown;
        };
    }
    | undefined = {}Optional notification params (typically empty)

#### Returns Promise<void>

#### Example[](#example-19)

```
`// In your MCP client notification handler:
mcpClient.setNotificationHandler(ToolListChangedNotificationSchema, () => {
  bridge.sendToolListChanged();
});
`Copy
```

#### See[](#see-20)

`ToolListChangedNotification` from @modelcontextprotocol/sdk for the notification type

- Defined in [src/app-bridge.ts:767](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L767)

### sendToolResult[](#sendtoolresult)

- sendToolResult(
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
): Promise<void>[](#sendtoolresult-1)
Send tool execution result to the view.

The host MUST send this notification when tool execution completes successfully,
provided the view is still displayed. If the view was closed before execution
completes, the host MAY skip this notification. This must be sent after
[`sendToolInput`](#sendtoolinput).

#### Parameters

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
}Standard MCP tool execution result

#### Returns Promise<void>

#### Example[](#example-20)

```
`const result = await mcpClient.request(
  { method: "tools/call", params: { name: "get_weather", arguments: args } },
  CallToolResultSchema,
);
bridge.sendToolResult(result);
`Copy
```

#### See[](#see-21)

- [`McpUiToolResultNotification`](../interfaces/app.McpUiToolResultNotification.html) for the notification type

- [`sendToolInput`](#sendtoolinput) for sending tool arguments before results

- Defined in [src/app-bridge.ts:1219](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1219)

### setHostContext[](#sethostcontext)

- setHostContext(hostContext: [McpUiHostContext](../interfaces/app.McpUiHostContext.html)): void[](#sethostcontext-1)
Update the host context and notify the view of changes.

Compares fields present in the new context with the current context and sends a
`ui/notifications/host-context-changed` notification containing only fields
that have been added or modified. If no fields have changed, no notification is sent.
The new context fully replaces the internal state.

Common use cases include notifying the view when:

Theme changes (light/dark mode toggle)

- Viewport size changes (window resize)

- Display mode changes (inline/fullscreen)

- Locale or timezone changes

#### Parameters

- hostContext: [McpUiHostContext](../interfaces/app.McpUiHostContext.html)The complete new host context state

#### Returns void

#### Example: Update theme when user toggles dark mode[](#example-update-theme-when-user-toggles-dark-mode)

```
`bridge.setHostContext({ theme: "dark" });
`Copy
```

#### Example: Update multiple context fields[](#example-update-multiple-context-fields)

```
`bridge.setHostContext({
  theme: "dark",
  containerDimensions: { maxHeight: 600, width: 800 },
});
`Copy
```

#### See[](#see-22)

- [`McpUiHostContext`](../interfaces/app.McpUiHostContext.html) for the context structure

- [`McpUiHostContextChangedNotification`](../interfaces/app.McpUiHostContextChangedNotification.html) for the notification type

- Defined in [src/app-bridge.ts:1094](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1094)

### setNotificationHandler[](#setnotificationhandler)

- setNotificationHandler<[T](#setnotificationhandlert) extends AnyObjectSchema>(
    notificationSchema: [T](app.App.html#setnotificationhandlert),
    handler: (notification: SchemaOutput<[T](app.App.html#setnotificationhandlert)>) => void | Promise<void>,
): void[](#setnotificationhandler-1)
Registers a handler to invoke when this protocol object receives a notification with the given method.

Note that this will replace any previous notification handler for the same method.

#### Type Parameters

T extends AnyObjectSchema

### setRequestHandler[](#setrequesthandler)

- setRequestHandler<[T](#setrequesthandlert) extends AnyObjectSchema>(
    requestSchema: [T](app.App.html#setrequesthandlert),
    handler: (
        request: SchemaOutput<[T](app.App.html#setrequesthandlert)>,
        extra: RequestHandlerExtra<[AppRequest](../types/types.AppRequest.html), [AppNotification](../types/types.AppNotification.html)>,
    ) => [AppResult](../types/types.AppResult.html) | Promise<[AppResult](../types/types.AppResult.html)>,
): void[](#setrequesthandler-1)
Registers a handler to invoke when this protocol object receives a request with the given method.

Note that this will replace any previous request handler for the same method.

#### Type Parameters

T extends AnyObjectSchema

### teardownResource[](#teardownresource)

- teardownResource(
    params: {},
    options?: RequestOptions,
): Promise<Record<string, unknown>>[](#teardownresource-1)
Request graceful shutdown of the view.

The host MUST send this request before tearing down the UI resource (before
unmounting the iframe). This gives the view an opportunity to save state,
cancel pending operations, or show confirmation dialogs.

The host SHOULD wait for the response before unmounting to prevent data loss.

#### Parameters

params: {}Empty params object

- `Optional`options: RequestOptionsRequest options (timeout, etc.)

#### Returns Promise<Record<string, unknown>>

Promise resolving when view confirms readiness for teardown

#### Example[](#example-21)

```
`try {
  await bridge.teardownResource({});
  // View is ready, safe to unmount iframe
  iframe.remove();
} catch (error) {
  console.error("Teardown failed:", error);
}
`Copy
```

- Defined in [src/app-bridge.ts:1311](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app-bridge.ts#L1311)

