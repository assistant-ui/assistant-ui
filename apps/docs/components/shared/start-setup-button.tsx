"use client";

import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useBeginSetup } from "@/components/shared/setup-navigation";
import { analytics } from "@/lib/analytics";

/** Starts a browser-first setup for the given products and opens the setup page, where the user hands it to their coding agent. */
export function StartSetupButton({
  children,
  location,
  products = ["assistant-ui"],
  instructions,
  trigger = <Button />,
}: {
  children: ReactNode;
  location: string;
  /** Catalog slugs the setup installs. */
  products?: readonly string[];
  instructions?: string;
  trigger?: ReactElement<{ onClick?: () => void; children?: ReactNode }>;
}) {
  const beginSetup = useBeginSetup();
  const ownClick = trigger.props.onClick;
  return cloneElement(trigger, {
    onClick: () => {
      ownClick?.();
      analytics.cta.clicked("start_setup_agent", location);
      beginSetup(products, instructions ?? "", {
        source: "start_button",
        location,
      });
    },
    children,
  });
}
