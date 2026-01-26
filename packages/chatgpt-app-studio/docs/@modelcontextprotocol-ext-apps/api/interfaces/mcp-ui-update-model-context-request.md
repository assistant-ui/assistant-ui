# McpUiUpdateModelContextRequest

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

Request to update the agent's context without requiring a follow-up action (View -> Host).

Unlike `notifications/message` which is for debugging/logging, this request is intended
to update the Host's model context. Each request overwrites the previous context sent by the View.
Unlike messages, context updates do not trigger follow-ups.

The host will typically defer sending the context to the model until the next user message
(including `ui/message`), and will only send the last update received.

#### See[](#see)

[`App.updateModelContext`](../classes/app.App.html#updatemodelcontext) for the method that sends this request

##### Index

### Properties

[method](#method)
[params](#params)

### method[](#method)

method: "ui/update-model-context"

- Defined in [src/spec.types.ts:400](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L400)

### params[](#params)

params: {
    content?: ContentBlock[];
    structuredContent?: Record<string, unknown>;
}
#### Type Declaration

- ##### `Optional`content?: ContentBlock[]

#### Description[](#description-1)

Context content blocks (text, image, etc.).

- ##### `Optional`structuredContent?: Record<string, unknown>

#### Description[](#description-2)

Structured content for machine-readable context data.

- Defined in [src/spec.types.ts:401](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L401)

