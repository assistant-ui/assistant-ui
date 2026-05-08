export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mx-auto mb-3 w-full max-w-4xl rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2 text-red-100 text-sm">
      {message}
    </div>
  );
}
