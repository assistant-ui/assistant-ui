import { cva } from "class-variance-authority";

export const reasoningVariants = cva("aui-reasoning-root mb-4 w-full", {
  variants: {
    variant: {
      outline: "rounded-lg border px-3 py-2",
      ghost: "",
      muted: "rounded-lg bg-muted/50 px-3 py-2",
    },
  },
  defaultVariants: {
    variant: "outline",
  },
});
