import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { StatusBadge } from "./status-badge";

export const DESCRIPTION_LINK_CLASSNAME =
  "font-medium text-foreground underline underline-offset-2";

const AS_CHILD = {
  type: "boolean",
  default: "false",
};

export const COMMON_PARAMS: Record<
  "parameters" | "primitives",
  Record<string, { type: string; default: string; description: ReactNode }>
> = {
  parameters: {
    asChild: {
      ...AS_CHILD,
      description: (
        <>
          Change the default rendered element for the one passed as a child,
          merging their props and behavior.
          <br />
          <br />
          Read the{" "}
          <Link
            className={DESCRIPTION_LINK_CLASSNAME}
            href="/docs/api-reference/primitives/composition"
          >
            Composition
          </Link>{" "}
          guide for more details.
        </>
      ),
    },
  },
  primitives: {
    asChild: {
      ...AS_CHILD,
      description: (
        <>
          Change the default rendered element for the one passed as a child,
          merging their props and behavior.{" "}
          <Link
            className="text-primary font-medium underline underline-offset-2"
            href="/docs/api-reference/primitives/composition"
          >
            Composition guide
          </Link>
        </>
      ),
    },
  },
};

type AnnotatedParameter = {
  name: string;
  deprecated?: string | undefined;
  experimental?: boolean | undefined;
};

export function getParameterAnnotations(
  parameter: AnnotatedParameter,
  placement: "term" | "description",
): ReactNode[] {
  const annotations: ReactNode[] = [];

  if (parameter.deprecated) {
    annotations.push(
      placement === "term" ? (
        <StatusBadge key="deprecated" variant="deprecated" />
      ) : (
        <Fragment key="deprecated">
          <StatusBadge variant="deprecated" className="mr-1" />
          <span>{parameter.deprecated}</span>
        </Fragment>
      ),
    );
  }

  if (parameter.experimental || parameter.name.startsWith("unstable_")) {
    annotations.push(
      <StatusBadge
        key="unstable"
        variant="unstable"
        {...(placement === "description" ? { className: "mr-1" } : {})}
      />,
    );
  }

  return annotations;
}

export function DeprecatedNotice({
  deprecated,
}: {
  deprecated: string | undefined;
}) {
  return deprecated ? (
    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
      Deprecated: {deprecated}
    </p>
  ) : null;
}
