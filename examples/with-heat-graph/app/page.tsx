import { ActivityGraph } from "@/lib/activity-graph";
import { generateSampleData } from "@/lib/generate-data";

const data = generateSampleData(new Date("2026-03-11"), 365);

export default function Home() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-bold text-3xl text-gray-900">
          Activity Graph
        </h1>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <ActivityGraph data={data} />
        </div>
      </div>
    </div>
  );
}
