import Link from "next/link";

export default function TapLandingPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="text-left">
        <h1 className="font-bold">tap</h1>
        <p className="text-muted-foreground">Hooks for Reactive Resources</p>
        <Link href="/tap/docs" className="text-muted-foreground underline">
          Docs &gt;
        </Link>
      </div>
    </div>
  );
}
