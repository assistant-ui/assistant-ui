import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui } from "@assistant-ui/store";
import { useElicitationContext } from "./context";
import { prepareElicitationContent } from "./prepareElicitationContent";

export namespace McpElicitationPrimitiveAccept {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpElicitationPrimitiveAccept = forwardRef<
  McpElicitationPrimitiveAccept.Element,
  McpElicitationPrimitiveAccept.Props
>((props, ref) => {
  const { elicitation, draft } = useElicitationContext();
  const aui = useAui();
  const { content, missingRequired, invalid } = prepareElicitationContent(
    elicitation.requestedSchema,
    draft,
  );
  const hasMissingRequired = missingRequired.length > 0;
  const hasInvalid = invalid.length > 0;
  return (
    <Primitive.button
      {...props}
      type="button"
      ref={ref}
      disabled={props.disabled || hasMissingRequired || hasInvalid}
      data-missing-required={hasMissingRequired ? "" : undefined}
      data-invalid={hasInvalid ? invalid.join(",") : undefined}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented || hasMissingRequired || hasInvalid) return;
        aui.mcpServer.answerElicitation(elicitation.id, {
          action: "accept",
          content,
        });
      }}
    />
  );
});

McpElicitationPrimitiveAccept.displayName = "McpElicitationPrimitive.Accept";
