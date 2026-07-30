"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Collapsible } from "radix-ui";
import {
  InnerLine,
  type AnnotationHandler,
  type BlockAnnotation,
} from "codehike/code";

const AUTO_COLLAPSE_DELAY = 400;

export const CollapseSettledContext = createContext(true);

const CollapseRoot = ({
  annotation,
  children,
}: {
  annotation: BlockAnnotation;
  children: ReactNode;
}) => {
  const settled = useContext(CollapseSettledContext);
  const collapsed = annotation.query === "collapsed";
  const [open, setOpen] = useState(!(collapsed && settled));

  useEffect(() => {
    if (!collapsed || settled) return;
    const timer = setTimeout(() => setOpen(false), AUTO_COLLAPSE_DELAY);
    return () => clearTimeout(timer);
  }, [collapsed, settled]);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      {children}
    </Collapsible.Root>
  );
};

export const collapse: AnnotationHandler[] = [
  {
    name: "collapse",
    transform: (annotation: BlockAnnotation) => [
      annotation,
      {
        ...annotation,
        toLineNumber: annotation.fromLineNumber,
        name: "CollapseTrigger",
      },
      {
        ...annotation,
        fromLineNumber: annotation.fromLineNumber + 1,
        name: "CollapseContent",
      },
    ],
    Block: CollapseRoot,
  },
  {
    name: "CollapseTrigger",
    onlyIfAnnotated: true,
    AnnotatedLine: ({ annotation, ...props }) => (
      <Collapsible.Trigger asChild>
        <InnerLine
          merge={props}
          className="ch-collapse-trigger data-[state=closed]:after:text-fd-muted-foreground/60 cursor-pointer select-none data-[state=closed]:whitespace-nowrap data-[state=closed]:after:ml-2 data-[state=closed]:after:content-['⋯']"
        />
      </Collapsible.Trigger>
    ),
  },
  {
    name: "CollapseContent",
    Block: ({ children }) => (
      <Collapsible.Content className="ch-collapse-content">
        {children}
      </Collapsible.Content>
    ),
  },
];
