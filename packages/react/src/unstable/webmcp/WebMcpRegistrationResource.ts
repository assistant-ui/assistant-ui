import { useEffect, useRef, useState } from "react";
import { resource } from "@assistant-ui/tap";
import type { Tool } from "assistant-stream";
import { toWebMcpTool } from "./convertTools";
import type { WebMcpHost } from "./webmcp-host";

export type WebMcpRegistrationProps = {
  host: WebMcpHost;
  name: string;
  /** Re-registers when it changes; an execute-only edit reads through instead. */
  signature: string;
  tool: Tool<any, any>;
  getCurrentTool: (name: string) => Tool<any, any> | undefined;
};

// The explainer specifies NotAllowedError for a page whose tools permission is
// off, which a cross-origin iframe without allow="tools" reaches routinely. It
// documents no rejection for a name already taken, so that stays a hedge.
const notPermitted = (error: unknown) =>
  (error as { name?: unknown } | null | undefined)?.name === "NotAllowedError";

const notPermittedMessage = (name: string) =>
  `[assistant-ui] WebMCP registration for tool "${name}" was not permitted; the page's tools permission is disabled.`;

const useWebMcpRegistration = ({
  host,
  name,
  signature,
  tool,
  getCurrentTool,
}: WebMcpRegistrationProps): string | null => {
  // A refused name is remembered for as long as the tool stays in the model
  // context, so a permanent collision warns once rather than on every sync.
  const [refused, setRefused] = useState(false);
  const fallbackToolRef = useRef(tool);

  useEffect(() => {
    if (refused) return undefined;

    const lifecycle = new AbortController();
    let live = true;
    let dispose: (() => void) | undefined;

    const refuse = (message: string, error: unknown) => {
      if (!live) return;
      live = false;
      setRefused(true);
      console.warn(message, error);
    };

    try {
      dispose = host.registerTool(
        toWebMcpTool(
          name,
          () => getCurrentTool(name) ?? fallbackToolRef.current,
          lifecycle.signal,
        ),
        (error) =>
          refuse(
            notPermitted(error)
              ? notPermittedMessage(name)
              : `[assistant-ui] WebMCP registration for tool "${name}" failed (name may already be registered).`,
            error,
          ),
      );
    } catch (error) {
      refuse(
        notPermitted(error)
          ? notPermittedMessage(name)
          : `[assistant-ui] Skipping WebMCP registration for tool "${name}": registerTool failed (name may already be registered).`,
        error,
      );
      return undefined;
    }

    return () => {
      live = false;
      lifecycle.abort();
      try {
        dispose();
      } catch (error) {
        console.warn(
          `[assistant-ui] Unregistering WebMCP tool "${name}" failed.`,
          error,
        );
      }
    };
  }, [getCurrentTool, host, name, signature, refused]);

  return refused ? null : name;
};

export const WebMcpRegistrationResource = resource(useWebMcpRegistration);
