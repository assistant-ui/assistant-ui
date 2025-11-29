"use client";

import { Marquee } from "@/components/magicui/marquee";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Image from "next/image";

export function Logos() {
  const isMobile = useMediaQuery("(max-width: 1080px)");

  const content = (
    <div className="flex w-full items-center justify-around">
      <Image
        src="/logos/cust/langchain.svg"
        alt="Langchain"
        width={100}
        height={28}
        className="h-7 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src="/logos/cust/athenaintel.png"
        alt="Athena Intelligence"
        width={100}
        height={44}
        className="h-11 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src="/logos/cust/browseruse.svg"
        alt="Browseruse"
        width={100}
        height={26}
        className="h-6 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src="/logos/cust/stack.svg"
        alt="Stack"
        width={100}
        height={22}
        className="h-5 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
    </div>
  );

  if (isMobile) {
    return (
      <div className="w-full overflow-clip">
        <Marquee repeat={4}>
          <div className="flex w-[1000px]">{content}</div>
        </Marquee>
      </div>
    );
  }

  return content;
}

