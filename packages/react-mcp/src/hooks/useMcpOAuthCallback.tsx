import { type FC, type ReactNode, useEffect, useState } from "react";
import { useAui } from "@assistant-ui/store";
import { decodeServerIdFromState } from "../auth/createOAuthProvider";

export type UseMcpOAuthCallbackOptions = {
  /** Defaults to `window.location.href`. */
  url?: string;
  onComplete?: (serverId: string) => void;
  onError?: (err: Error) => void;
};

export type UseMcpOAuthCallbackResult = {
  status: "idle" | "running" | "done" | "error";
  serverId: string | null;
  error: Error | null;
};

export function useMcpOAuthCallback(
  opts: UseMcpOAuthCallbackOptions = {},
): UseMcpOAuthCallbackResult {
  const aui = useAui();
  const [result, setResult] = useState<UseMcpOAuthCallbackResult>({
    status: "idle",
    serverId: null,
    error: null,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-running on callback identity changes would double-redeem the OAuth code
  useEffect(() => {
    const url =
      opts.url ?? (typeof window !== "undefined" ? window.location.href : null);
    if (!url) return;

    let cancelled = false;
    (async () => {
      try {
        const parsed = new URL(url);
        const state = parsed.searchParams.get("state");
        const error = parsed.searchParams.get("error");
        if (error) {
          throw new Error(
            parsed.searchParams.get("error_description") ?? error,
          );
        }
        if (!state) throw new Error("missing state parameter in callback URL");
        const serverId = decodeServerIdFromState(state);
        if (!serverId) {
          throw new Error("callback state does not match an MCP server");
        }
        if (cancelled) return;
        setResult({ status: "running", serverId, error: null });
        await aui.mcp().server({ id: serverId }).completeAuth(url);
        if (cancelled) return;
        setResult({ status: "done", serverId, error: null });
        opts.onComplete?.(serverId);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        setResult((prev) => ({ ...prev, status: "error", error: e }));
        opts.onError?.(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aui, opts.url]);

  return result;
}

export const McpOAuthCallback: FC<
  UseMcpOAuthCallbackOptions & {
    children?: (result: UseMcpOAuthCallbackResult) => ReactNode;
  }
> = ({ children, ...opts }) => {
  const result = useMcpOAuthCallback(opts);
  if (children) return <>{children(result)}</>;
  return null;
};
