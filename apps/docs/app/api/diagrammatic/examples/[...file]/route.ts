import {
  isExampleName,
  listExampleNames,
  readHighlightedExample,
} from "@/components/diagrammatic/example-source";

// One JSON file per example, prerendered at build time: the source and its
// highlighted HTML, for the Code tab of <Example>.
export function generateStaticParams() {
  return listExampleNames().map((name) => ({ file: name.split("/") }));
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/diagrammatic/examples/[...file]">,
) {
  const name = (await params).file.join("/");
  if (!isExampleName(name) || !listExampleNames().includes(name)) {
    return Response.json({ error: "Unknown example" }, { status: 404 });
  }
  return Response.json(await readHighlightedExample(name), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
