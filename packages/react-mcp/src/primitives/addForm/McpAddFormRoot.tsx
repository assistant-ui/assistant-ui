import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type FormEventHandler,
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui } from "@assistant-ui/store";
import {
  AddFormContext,
  type AddFormFieldIds,
  type AddFormState,
} from "./context";
import type { MCPAuthConfig } from "../../mcp-scope";
import { invokeMcpCallback } from "../../utils/invokeMcpCallback";

const INITIAL: AddFormState = {
  name: "",
  url: "",
  authType: "oauth",
  bearerToken: "",
  scopes: "",
  submitting: false,
  error: null,
  errorField: null,
};

function validateUrl(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "URL is required" };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "URL must be http(s)" };
  }
  return { url: trimmed };
}

export namespace McpAddFormPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.form>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.form>,
    "onSubmit"
  > & {
    onSubmitted?: (id: string) => void;
    onCancel?: () => void;
  };
}

export const McpAddFormPrimitiveRoot = forwardRef<
  McpAddFormPrimitiveRoot.Element,
  McpAddFormPrimitiveRoot.Props
>(({ onSubmitted, onCancel, ...props }, ref) => {
  const aui = useAui();
  const formId = useId();
  const [state, setState] = useState<AddFormState>(INITIAL);
  const ids = useMemo<AddFormFieldIds>(
    () => ({
      name: `${formId}-name`,
      url: `${formId}-url`,
      auth: `${formId}-auth`,
      bearerToken: `${formId}-bearer-token`,
      scopes: `${formId}-oauth-scopes`,
      error: `${formId}-error`,
    }),
    [formId],
  );

  const setField = useCallback(
    <K extends keyof AddFormState>(key: K, value: AddFormState[K]) => {
      setState((prev) => {
        const clearsError =
          prev.errorField === "form" ||
          prev.errorField === key ||
          (key === "authType" && prev.errorField === "bearerToken");
        return {
          ...prev,
          [key]: value,
          ...(clearsError ? { error: null, errorField: null } : {}),
        };
      });
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL), []);

  const buildAuth = useCallback((): MCPAuthConfig => {
    switch (state.authType) {
      case "none":
        return { type: "none" };
      case "bearer":
        return { type: "bearer", token: state.bearerToken || undefined };
      case "oauth": {
        const scopeList = state.scopes
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          type: "oauth",
          scopes: scopeList.length > 0 ? scopeList : undefined,
        };
      }
    }
  }, [state.authType, state.bearerToken, state.scopes]);

  const submit = useCallback(async () => {
    if (state.submitting) return;
    if (!state.name.trim()) {
      setState((p) => ({
        ...p,
        error: "Name is required",
        errorField: "name",
      }));
      return;
    }
    if (state.authType === "bearer" && !state.bearerToken.trim()) {
      setState((p) => ({
        ...p,
        error: "Bearer token is required",
        errorField: "bearerToken",
      }));
      return;
    }
    const urlResult = validateUrl(state.url);
    if ("error" in urlResult) {
      setState((p) => ({
        ...p,
        error: urlResult.error,
        errorField: "url",
      }));
      return;
    }
    setState((p) => ({
      ...p,
      submitting: true,
      error: null,
      errorField: null,
    }));
    try {
      const id = await aui.mcp.addCustomServer({
        name: state.name.trim(),
        url: urlResult.url,
        auth: buildAuth(),
      });
      setState(INITIAL);
      invokeMcpCallback("onSubmitted", onSubmitted, id);
    } catch (err) {
      setState((p) => ({
        ...p,
        submitting: false,
        error: err instanceof Error ? err.message : String(err),
        errorField: "form",
      }));
    }
  }, [aui, buildAuth, onSubmitted, state]);

  const cancel = useCallback(() => {
    setState(INITIAL);
    onCancel?.();
  }, [onCancel]);

  const value = useMemo(
    () => ({ state, ids, setField, reset, submit, cancel }),
    [state, ids, setField, reset, submit, cancel],
  );

  const onFormSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    void submit();
  };

  return (
    <AddFormContext.Provider value={value}>
      <Primitive.form {...props} ref={ref} onSubmit={onFormSubmit} />
    </AddFormContext.Provider>
  );
});

McpAddFormPrimitiveRoot.displayName = "McpAddFormPrimitive.Root";
