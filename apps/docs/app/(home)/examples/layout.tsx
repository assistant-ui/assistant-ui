import { ExamplesNavbar } from "@/components/ExamplesNavbar";

export default function ExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <ExamplesNavbar />
      {children}
    </div>
  );
}
