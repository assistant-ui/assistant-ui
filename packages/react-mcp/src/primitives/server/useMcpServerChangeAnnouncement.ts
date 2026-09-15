import { useEffect, useRef } from "react";

export const useMcpServerChangeAnnouncement = <T>(value: T) => {
  const previousValue = useRef(value);
  const changed = !Object.is(previousValue.current, value);
  const announced = useRef(false);

  useEffect(() => {
    if (!changed) return;
    previousValue.current = value;
    announced.current = true;
  }, [changed, value]);

  return announced.current || changed;
};
