import Cal, { getCalApi } from "@calcom/embed-react";
import Link from "next/link";
import { useEffect } from "react";

export default function Onboarding() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({});
      cal("ui", {
        styles: { branding: { brandColor: "#000000" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <h2 className="font-extrabold text-2xl">Get Onboarded By a Founder</h2>
      <Cal
        calLink="simon-farshid/assistant-ui-onboarding"
        style={{ width: "100%", height: "620px", overflow: "scroll" }}
        config={{ layout: "month_view" }}
      />
      <h2 className="font-extrabold text-2xl">Self-Guided Onboarding</h2>
      <p>
        If you prefer to explore on your own, you can visit the{" "}
        <Link href="/docs/getting-started" className="text-green-600">
          Getting Started
        </Link>{" "}
        guide and documentation.
      </p>
    </div>
  );
}
