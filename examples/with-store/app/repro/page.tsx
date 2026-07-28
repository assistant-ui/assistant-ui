import { ReproPartIndexCrash } from "@/lib/repro-part-index-crash";

export default function ReproPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-8 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Stale part-index shrink repro
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Click the button. The parts array shrinks from 3 to 0 while a store
          subscriber flushSyncs the stale part leaf. With render-bound aui
          instances the leaf renders its bound part and unmounts cleanly — no
          crash.
        </p>
        <ReproPartIndexCrash />
      </div>
    </div>
  );
}
