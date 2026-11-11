"use client";

import Image from "next/image";
import { LOGOS } from "@/components/pages/home/trusted-by";
import { cn } from "@/lib/utils";

/**
 * Three marks only. Each gets its own box so the wide wordmarks and the
 * compact AWS smile read at the same optical weight.
 */
const LOGO_BOXES = [
  { name: "Google Cloud", box: "h-[18px] w-[111px] sm:h-[22px] sm:w-[136px]" },
  { name: "AWS", box: "h-[25px] w-[42px] sm:h-[30px] sm:w-[50px]" },
  { name: "Langchain", box: "h-[16px] w-[94px] sm:h-[19px] sm:w-[111px]" },
] as const;

export const CUSTOMER_LOGOS = LOGO_BOXES.flatMap(({ name, box }) => {
  const logo = LOGOS.find((item) => item.alt === name);
  return logo ? [{ ...logo, box }] : [];
});

const markClass =
  "object-contain opacity-60 grayscale transition duration-150 ease-out hover:opacity-100 hover:grayscale-0";

export function CustomerLogos() {
  return (
    <ul className="flex flex-wrap items-center gap-x-8 gap-y-6 sm:gap-x-12">
      {CUSTOMER_LOGOS.map((logo) => (
        <li key={logo.alt} className={cn("relative block", logo.box)}>
          <Image
            src={logo.src}
            alt={logo.alt === "Langchain" ? "LangChain" : logo.alt}
            fill
            sizes="136px"
            className={cn(
              markClass,
              logo.darkSrc
                ? "dark:hidden"
                : logo.invert === false
                  ? undefined
                  : "invert dark:invert-0",
            )}
          />
          {logo.darkSrc ? (
            <Image
              src={logo.darkSrc}
              alt={logo.alt}
              fill
              sizes="136px"
              className={cn(markClass, "hidden dark:block")}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
