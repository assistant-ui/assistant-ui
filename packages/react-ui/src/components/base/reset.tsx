import { ComponentPropsWithoutRef, forwardRef } from "react";

export const Reset = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>(({ children, className, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      className={"aui-reset" + (className ? " " + className : "")}
      {...rest}
    >
      {children}
    </div>
  );
});

Reset.displayName = "Reset";
