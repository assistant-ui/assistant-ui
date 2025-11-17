import Image from "next/image";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ExampleItem } from "@/lib/examples";

export function ExampleCard({
  title,
  image,
  description,
  link,
  external = false,
}: ExampleItem) {
  const cardContent = (
    <Card className="group relative flex min-h-[350px] flex-col overflow-hidden rounded-lg bg-card">
      <div className="overflow-hidden">
        <Image
          src={image}
          alt={title}
          width={600}
          height={400}
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105 md:aspect-[16/9]"
        />
      </div>
      <div className="flex flex-col gap-1 p-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <Link
      href={link}
      className="not-prose no-underline"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {cardContent}
    </Link>
  );
}
