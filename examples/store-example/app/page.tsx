import { ExampleApp } from "@/lib/example-app";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-4xl text-gray-900 dark:text-white">
            @assistant-ui/store Example
          </h1>
          <p className="text-gray-600 text-lg dark:text-gray-400">
            Demonstrating tap-based state management with scopes, lists, and
            providers
          </p>
        </div>

        <ExampleApp />
      </div>
    </div>
  );
}
