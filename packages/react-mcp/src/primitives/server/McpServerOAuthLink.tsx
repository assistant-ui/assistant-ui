import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

const isSafeAuthorizationHref = (href: string) => {
  try {
    const url = new URL(href, "http://localhost");
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export namespace McpServerPrimitiveOAuthLink {
  export type Element = ComponentRef<typeof Primitive.a>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.a>,
    "href"
  > & {
    /** Optional href override; defaults to the server's authorizationUrl. */
    href?: string;
  };
}

export const McpServerPrimitiveOAuthLink = forwardRef<
  McpServerPrimitiveOAuthLink.Element,
  McpServerPrimitiveOAuthLink.Props
>(({ href, ...props }, ref) => {
  const url = useAuiState((s) => s.mcpServer.authorizationUrl);
  const effective = href ?? url;
  if (!effective || !isSafeAuthorizationHref(effective)) return null;
  return (
    <Primitive.a
      target="_blank"
      {...props}
      ref={ref}
      href={effective}
      rel={props.rel ?? "noopener noreferrer"}
    />
  );
});

McpServerPrimitiveOAuthLink.displayName = "McpServerPrimitive.OAuthLink";
