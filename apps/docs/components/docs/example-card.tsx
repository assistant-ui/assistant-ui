import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ExampleItem } from "@/lib/examples";

export function ExampleCard({
  title,
  image,
  description,
  link,
  external = false,
}: ExampleItem) {
  return (
    <Link
      href={link}
      className="not-prose group block overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/20"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      <div className="overflow-hidden">
        <Image
          src={image}
          alt={title}
          width={600}
          height={400}
          className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          {external && (
            <ArrowUpRight className="size-4 text-muted-foreground" />
          )}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
