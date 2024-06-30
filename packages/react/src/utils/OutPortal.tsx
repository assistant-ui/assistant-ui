import { useRef, type FC } from "react";
import { useLayoutEffect } from "@radix-ui/react-use-layout-effect";

type OutPortalProps = {
  node: HTMLElement | null;
};

export const OutPortal: FC<OutPortalProps> = ({ node }) => {
  const parentRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const parent = parentRef.current;
    if (!parent || !node) return;

    parent.appendChild(node);
    return () => {
      parent.removeChild(node);
    };
  }, [node]);

  if (!node) return null;
  return <span ref={parentRef} />;
};
