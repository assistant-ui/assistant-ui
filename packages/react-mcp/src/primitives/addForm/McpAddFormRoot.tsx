import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type FormEventHandler,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui } from "@assistant-ui/store";
import { AddFormContext, type AddFormState } from "./context";
import type { MCPAuthConfig, MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPStorage } from "../../resources/storage/types";

const INITIAL: AddFormState = {
  name: "",
  url: "",
  authType: "oauth",
  bearerToken: "",
  scopes: "",
  submitting: false,
  error: null,
};

export namespace McpAddFormPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.form>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.form>,
    "onSubmit"
  > & {
    onSubmitted?: (id: string) => void;
    onCancel?: () => void;
    /**
     * Override how the bearer token is persisted. By default, this is best-effort:
     * the manager stores the bearer auth config on the record, including the token.
     * If you don't want plaintext tokens in localStorage, pass a custom impl
     * that persists to a server endpoint.
     */
    persistBearerToken?: (
      storage: MCPStorage,
      record: MCPCustomServerRecord,
      token: string,
    ) => Promise<void>;
  };
}

export const McpAddFormPrimitiveRoot = forwardRef<
  McpAddFormPrimitiveRoot.Element,
  McpAddFormPrimitiveRoot.Props
>(({ onSubmitted, onCancel, persistBearerToken, ...props }, ref) => {
  const aui = useAui();
  const [state, setState] = useState<AddFormState>(INITIAL);

  const setField = useCallback(
    <K extends keyof AddFormState>(key: K, value: AddFormState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
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
      setState((p) => ({ ...p, error: "Name is required" }));
      return;
    }
    if (!state.url.trim()) {
      setState((p) => ({ ...p, error: "URL is required" }));
      return;
    }
    try {
      new URL(state.url);
    } catch {
      setState((p) => ({ ...p, error: "Invalid URL" }));
      return;
    }
    setState((p) => ({ ...p, submitting: true, error: null }));
    try {
      const id = await aui.mcp().addCustomServer({
        name: state.name.trim(),
        url: state.url.trim(),
        auth: buildAuth(),
      });
      setState(INITIAL);
      onSubmitted?.(id);
    } catch (err) {
      setState((p) => ({
        ...p,
        submitting: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [aui, buildAuth, onSubmitted, state]);

  const cancel = useCallback(() => {
    setState(INITIAL);
    onCancel?.();
  }, [onCancel]);

  const value = useMemo(
    () => ({ state, setField, reset, submit, cancel, buildAuth }),
    [state, setField, reset, submit, cancel, buildAuth],
  );

  const onFormSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    void submit();
  };

  // `persistBearerToken` is currently unused; reserved for an explicit
  // post-create token write step when a future bearer-out-of-band flow lands.
  void persistBearerToken;

  return (
    <AddFormContext.Provider value={value}>
      <Primitive.form {...props} ref={ref} onSubmit={onFormSubmit} />
    </AddFormContext.Provider>
  );
});

McpAddFormPrimitiveRoot.displayName = "McpAddFormPrimitive.Root";
