export default function Component() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mt-12 mb-28 text-center">
        <h1 className="mt-4 text-5xl font-bold">Form Filling Co-Pilot</h1>
      </header>

      <div className="h-[700px]">
        <iframe
          title="Stockbroker example"
          className="h-full w-full border-none"
          src="https://assistant-ui-form-demo.vercel.app/"
        />
      </div>
    </div>
  );
}
