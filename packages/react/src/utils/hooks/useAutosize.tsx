import { MutableRefObject, useLayoutEffect } from "react";

export const useAutosize = (
  ref: MutableRefObject<HTMLTextAreaElement | null>,
) => {
  const el = ref.current;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const callback = () => {
      el.style.height = "0px";
      el.style.height = el.scrollHeight + "px";
    };
    el.addEventListener("input", callback);
    callback();

    return () => {
      el.removeEventListener("input", callback);
    };
  }, [ref, el]);
};
