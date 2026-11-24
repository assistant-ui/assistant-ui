import { cacheLife } from "next/cache";
import { connection } from "next/server";

const API = "https://api.modelpedia.dev/v1";
const PAGE = 500;

type Listed = {
  id: string;
  name: string;
  provider: string;
  status?: string;
  model_type?: string;
  modalities?: { output?: string[] };
};

type Page<T> = { data: T; meta: { total: number } };

export type ImageModel = {
  /** The provider and the model's id there, as `provider/id`. */
  id: string;
  name: string;
  provider: string;
};

async function read<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`Modelpedia answered ${response.status}.`);
  return response.json() as Promise<T>;
}

const makesImages = (model: Listed) => {
  if (model.status === "deprecated" || model.id.includes("video")) return false;
  const output = model.modalities?.output;
  if (!output) return model.model_type === "image";
  return (
    output.includes("image") &&
    !output.includes("video") &&
    (model.model_type === "image" || model.model_type === "chat")
  );
};

/* Modelpedia has no filter for what a model makes, so the whole list is read once a day and the image makers kept. */
async function imageModels(): Promise<ImageModel[]> {
  "use cache";
  cacheLife("days");

  const page = (offset: number) =>
    read<Page<Listed[]>>(`/models?limit=${PAGE}&offset=${offset}`);
  const [providers, first] = await Promise.all([
    read<{ data: { id: string; name: string }[] }>("/providers"),
    page(0),
  ]);
  const rest = await Promise.all(
    Array.from(
      { length: Math.max(0, Math.ceil(first.meta.total / PAGE) - 1) },
      (_, index) => page((index + 1) * PAGE),
    ),
  );
  const names = new Map(providers.data.map((entry) => [entry.id, entry.name]));

  return [first, ...rest]
    .flatMap((entry) => entry.data)
    .filter(makesImages)
    .map((model) => ({
      id: `${model.provider}/${model.id}`,
      name: model.name,
      provider: names.get(model.provider) ?? model.provider,
    }));
}

export async function GET() {
  await connection();
  try {
    return Response.json({ models: await imageModels() });
  } catch {
    return new Response("The list of image models could not be read.", {
      status: 502,
    });
  }
}
