import { ToolUIInstance } from "../core/instance";
import { ToolUIRegistry } from "../registry/registry";
import { ToolUISandbox } from "../sandbox/types";
import { ToolUIRenderOutput } from "./types";

export type ToolUIRendererSession = {
  readonly instance: ToolUIInstance;
  output: ToolUIRenderOutput;
  container: HTMLElement;
  sandbox?: ToolUISandbox;
};

/**
 * TODO: renderer plugins (custom renderers) support
 */
export class ToolUIRendererManager {
  private readonly _registry: ToolUIRegistry;
  private readonly _createSandbox: () => ToolUISandbox;
  private readonly _sessions = new Map<string, ToolUIRendererSession>();

  constructor(options: {
    registry: ToolUIRegistry;
    createSandbox: () => ToolUISandbox;
  }) {
    this._registry = options.registry;
    this._createSandbox = options.createSandbox;
  }

  public mount(instance: ToolUIInstance, container: HTMLElement): void {
    const id = instance.id;

    if (this._sessions.has(id)) {
      return;
    }

    const output = this._resolveOutput(instance);

    if (!output || output.kind === "empty") {
      return;
    }

    const session: ToolUIRendererSession = {
      instance,
      output,
      container,
    };

    this._sessions.set(id, session);

    this._render(session);
  }

  public update(instance: ToolUIInstance): void {
    const session = this._sessions.get(instance.id);
    if (!session) return;

    const output = this._resolveOutput(instance);
    if (!output) return;

    session.output = output;

    this._render(session);
  }

  public unmount(instance: ToolUIInstance): void {
    const session = this._sessions.get(instance.id);
    if (!session) return;

    if (session.sandbox) {
      session.sandbox.unmount();
    }

    session.container.innerHTML = "";

    this._sessions.delete(instance.id);
  }

  public list(): readonly ToolUIRendererSession[] {
    return Array.from(this._sessions.values());
  }

  private _resolveOutput(
    instance: ToolUIInstance,
  ): ToolUIRenderOutput | undefined {
    const state = instance.getState();
    const factory = this._registry.resolve(state.context.toolName);

    if (!factory) return undefined;

    return factory({
      id: state.id,
      lifecycle: state.lifecycle,
      context: state.context,
      result: state.result,
    });
  }

  private _render(session: ToolUIRendererSession): void {
    const { container, instance, output } = session;

    switch (output.kind) {
      case "empty": {
        return;
      }

      case "react": {
        /**
         * React rendering is handled by React layer
         * only the output is stored here
         */
        return;
      }

      case "html": {
        if (!this._createSandbox) {
          throw new Error(
            "Too UI output requires a sandbox, but no sandbox factory was provided",
          );
        }

        if (!session.sandbox) {
          const sandbox = this._createSandbox();
          session.sandbox = sandbox;

          void sandbox.mount(instance, output, container);
        } else {
          void session.sandbox.update(instance, output);
        }

        return;
      }

      default: {
        const _exhaustive: never = output;
        throw new Error(`Unknown ToolUIRenderOutput kind: ${_exhaustive}`);
      }
    }
  }
}
