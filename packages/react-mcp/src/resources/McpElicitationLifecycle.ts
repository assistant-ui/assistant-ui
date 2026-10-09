import { useRef, useState } from "react";
import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/client";
import type { MCPElicitation, MCPElicitationResponse } from "../mcp-scope";
import { createMcpId } from "../utils/createMcpId";
import { validateElicitationContent } from "./validateElicitationContent";

export const useMcpElicitationLifecycle = () => {
  const [pendingElicitations, setPendingElicitations] = useState<
    MCPElicitation[]
  >([]);
  const elicitationResolversRef = useRef(
    new Map<
      string,
      {
        resolve: (result: ElicitResult) => void;
        signal: AbortSignal;
        onAbort: () => void;
        requestedSchema: unknown;
      }
    >(),
  );
  const resolvePendingElicitation = (id: string, result: ElicitResult) => {
    const entry = elicitationResolversRef.current.get(id);
    if (!entry) return false;
    elicitationResolversRef.current.delete(id);
    entry.signal.removeEventListener("abort", entry.onAbort);
    setPendingElicitations((current) =>
      current.filter((elicitation) => elicitation.id !== id),
    );
    entry.resolve(result);
    return true;
  };

  const setPendingElicitationError = (
    id: string,
    error: NonNullable<MCPElicitation["error"]>,
  ) => {
    if (!elicitationResolversRef.current.has(id)) return false;
    setPendingElicitations((current) =>
      current.map((elicitation) =>
        elicitation.id === id ? { ...elicitation, error } : elicitation,
      ),
    );
    return true;
  };

  const cancelPendingElicitations = () => {
    for (const [id] of elicitationResolversRef.current) {
      resolvePendingElicitation(id, { action: "cancel" });
    }
  };

  const requestElicitation = (
    request: ElicitRequest,
    signal: AbortSignal,
    isCurrentConnection: () => boolean,
  ): Promise<ElicitResult> => {
    if (!isCurrentConnection()) {
      return Promise.resolve({ action: "cancel" });
    }
    if (!("requestedSchema" in request.params)) {
      return Promise.resolve({ action: "cancel" });
    }
    const { message, requestedSchema } = request.params;

    const id = createMcpId();
    const promise = new Promise<ElicitResult>((resolve) => {
      const onAbort = () => {
        resolvePendingElicitation(id, { action: "cancel" });
      };
      elicitationResolversRef.current.set(id, {
        resolve,
        signal,
        onAbort,
        requestedSchema,
      });
    });
    setPendingElicitations((current) => [
      ...current,
      {
        id,
        message,
        requestedSchema,
      },
    ]);
    const entry = elicitationResolversRef.current.get(id);
    if (entry) {
      if (signal.aborted) {
        entry.onAbort();
      } else {
        signal.addEventListener("abort", entry.onAbort, {
          once: true,
        });
      }
    }
    return promise;
  };

  return {
    pendingElicitations,
    cancelPendingElicitations,
    requestElicitation,
    answerElicitation: (
      id: string,
      response: MCPElicitationResponse,
    ): readonly { property: string; message: string }[] | undefined => {
      if (response.action === "accept") {
        const entry = elicitationResolversRef.current.get(id);
        if (!entry) return undefined;

        if (
          typeof response.content !== "object" ||
          response.content === null ||
          Array.isArray(response.content)
        ) {
          const errors = [
            {
              property: "content",
              message: "Response content must be an object.",
            },
          ];
          setPendingElicitationError(id, {
            message: "Invalid elicitation content: content.",
            properties: ["content"],
          });
          return errors;
        }

        const errors = validateElicitationContent(
          entry.requestedSchema,
          response.content,
        );
        if (errors.length > 0) {
          const properties = [
            ...new Set(errors.map((error) => error.property)),
          ];
          setPendingElicitationError(id, {
            message: `Invalid elicitation content: ${properties.join(", ")}.`,
            properties,
          });
          return errors;
        }

        const result: ElicitResult = {
          action: "accept",
          content: response.content as ElicitResult["content"],
        };
        resolvePendingElicitation(id, result);
        return undefined;
      }

      resolvePendingElicitation(id, { action: response.action });
      return undefined;
    },
  };
};
