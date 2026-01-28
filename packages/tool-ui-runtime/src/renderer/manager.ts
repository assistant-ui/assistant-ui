import { ToolUIInstance } from "../core/instance";
import { ToolUIRegistry } from "../registry/registry";
import { ToolUISandbox } from "../sandbox/types";
import { ToolUIRenderOutput } from "./types";

export type ToolUIRendererSession = {
  readonly instance: ToolUIInstance;
  output: ToolUIRenderOutput;
  container: HTMLElement;
  sandbox?: ToolUISandbox | undefined;
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
    if (!output) return;

    // Always create a session (even for empty output)
    const session: ToolUIRendererSession = {
      instance,
      output,
      container,
    };

    this._sessions.set(id, session);

    if (output.kind !== "empty") {
      this._renderSession(session);
    }
  }

  public update(instance: ToolUIInstance): void {
    const session = this._sessions.get(instance.id);
    if (!session) return;

    const nextOutput = this._resolveOutput(instance);
    if (!nextOutput) return;

    if (this._isSameOutput(session.output, nextOutput)) {
      return;
    }

    session.output = nextOutput;
    this._renderSession(session);
  }

  public unmount(instance: ToolUIInstance): void {
    const session = this._sessions.get(instance.id);
    if (!session) return;

    if (session.sandbox) {
      try {
        session.sandbox.unmount();
      } catch (error) {
        console.error(
          `Failed to unmount Tool UI sandbox for ${instance.id}:`,
          error,
        );
      }
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

  private _isSameOutput(a: ToolUIRenderOutput, b: ToolUIRenderOutput): boolean {
    if (a.kind !== b.kind) return false;

    if (a.kind === "html" && b.kind === "html") {
      return a.html === b.html && a.height === b.height;
    }

    if (a.kind === "react" && b.kind === "react") {
      return a.element === b.element;
    }

    return a.kind === "empty";
  }

  private _renderSession(session: ToolUIRendererSession): void {
    const { container, instance, output } = session;

    switch (output.kind) {
      case "empty": {
        if (session.sandbox) {
          session.sandbox.unmount();
          session.sandbox = undefined;
          container.innerHTML = "";
        }
        return;
      }

      case "react": {
        if (session.sandbox) {
          session.sandbox.unmount();
          session.sandbox = undefined;
          container.innerHTML = "";
        }
        // React rendering handled by React layer
        return;
      }

      case "html": {
        if (!session.sandbox) {
          const sandbox = this._createSandbox();
          session.sandbox = sandbox;

          try {
            const result = sandbox.mount(instance, output, container);
            if (result instanceof Promise) {
              result.catch((error) => {
                console.error(
                  `Failed to mount Tool UI sandbox for ${instance.id}:`,
                  error,
                );
                try {
                  sandbox.unmount();
                } catch {}
                container.innerHTML = "";
                this._sessions.delete(instance.id);
              });
            }
          } catch (error) {
            console.error(
              `Failed to mount Tool UI sandbox for ${instance.id}:`,
              error,
            );
            container.innerHTML = "";
            this._sessions.delete(instance.id);
          }
        } else {
          const result = session.sandbox.update(instance, output);
          if (result instanceof Promise) {
            result.catch((error) => {
              console.error(
                `Failed to update Tool UI sandbox for ${instance.id}:`,
                error,
              );
            });
          }
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
