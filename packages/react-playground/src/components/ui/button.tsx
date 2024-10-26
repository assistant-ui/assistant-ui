import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-aui-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aui-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-aui-primary text-aui-primary-foreground hover:bg-aui-primary/90",
        destructive:
          "bg-aui-destructive text-aui-destructive-foreground hover:bg-aui-destructive/90",
        outline:
          "border border-aui-input bg-aui-background hover:bg-aui-accent hover:text-aui-accent-foreground",
        secondary:
          "bg-aui-secondary text-aui-secondary-foreground hover:bg-aui-secondary/80",
        ghost: "hover:bg-aui-accent hover:text-aui-accent-foreground",
        link: "text-aui-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
