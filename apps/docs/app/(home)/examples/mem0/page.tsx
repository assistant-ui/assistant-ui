export default function Component() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <header className="mt-12 mb-8 text-center">
        <h1 className="mt-4 text-5xl font-bold">Mem0 - ChatGPT with memory</h1>
      </header>

      <div className="h-[700px]">
        <iframe
          title="Mem0 - ChatGPT with memory demo"
          className="h-full w-full border border-gray-200"
          src="https://mem0-4vmi.vercel.app/"
        />
      </div>
    </div>
  );
}
