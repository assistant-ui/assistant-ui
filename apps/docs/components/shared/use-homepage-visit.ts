import { useEffect, useRef, useState } from "react";

type UseHomepageVisitOptions = {
  pathname: string | null;
  mounted: boolean;
  visited: boolean;
  setVisited: (value: boolean) => void;
};

export function useHomepageVisit({
  pathname,
  mounted,
  visited,
  setVisited,
}: UseHomepageVisitOptions) {
  const [returningVisitor, setReturningVisitor] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (pathname !== "/") {
      handledRef.current = false;
      return;
    }
    if (!mounted || handledRef.current) return;

    handledRef.current = true;
    setReturningVisitor(visited);
    if (!visited) setVisited(true);
  }, [mounted, pathname, setVisited, visited]);

  return returningVisitor;
}
