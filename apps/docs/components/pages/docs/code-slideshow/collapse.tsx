"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    <Collapsible open={open} onOpenChange={setOpen}>
      {children}
    </Collapsible>
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
      <CollapsibleTrigger
        render={
          <InnerLine
            merge={props}
            className="ch-collapse-trigger not-data-[panel-open]:after:text-muted-foreground/60 cursor-pointer select-none not-data-[panel-open]:whitespace-nowrap not-data-[panel-open]:after:ml-2 not-data-[panel-open]:after:content-['⋯']"
          />
        }
      />
    ),
  },
  {
    name: "CollapseContent",
    Block: ({ children }) => (
      <CollapsibleContent className="ch-collapse-content">
        {children}
      </CollapsibleContent>
    ),
  },
];
