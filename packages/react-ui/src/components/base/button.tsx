import { cva, type VariantProps } from "class-variance-authority";
import { Primitive } from "@radix-ui/react-primitive";
import { ElementRef, forwardRef } from "react";

const buttonVariants = cva("aui-button", {
  variants: {
    variant: {
      default: "aui-button-primary",
      outline: "aui-button-outline",
      ghost: "aui-button-ghost",
    },
    size: {
      default: "aui-button-medium",
      icon: "aui-button-icon",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type ButtonElement = ElementRef<typeof Primitive.button>;

export type ButtonProps = React.ComponentPropsWithoutRef<
  typeof Primitive.button
> &
  VariantProps<typeof buttonVariants>;

const Button = forwardRef<ButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <Primitive.button
        className={buttonVariants({ variant, size, className })}
        {...props}
        ref={ref}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
