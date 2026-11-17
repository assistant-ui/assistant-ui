import { Assistant } from "./assistant";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="h-dvh">
      <Assistant scripted={!process.env.OPENAI_API_KEY} />
    </div>
  );
}
