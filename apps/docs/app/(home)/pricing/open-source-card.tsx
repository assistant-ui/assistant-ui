import { CheckIcon, GithubIcon } from "lucide-react";

export default function OpenSourceCard() {
  return (
    <div className="mx-auto mb-12 w-full max-w-[1000px]">
      <div className="flex flex-col rounded-lg border-2 p-6">
        <div className="flex-grow">
          <div className="mb-4 flex gap-3">
            <GithubIcon className="h-6 w-6" />
            <h3 className="text-xl font-semibold">
              Forever Free & Open Source (MIT License)
            </h3>
          </div>
          <p className="text-md mb-4">
            UI components for your AI chat application
          </p>
          <ul className="space-y-2 text-sm">
            {[
              "Customizable UI components",
              "Bring your own backend",
              "Community support",
            ].map((feature) => (
              <li key={feature} className="flex items-start">
                <CheckIcon className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
