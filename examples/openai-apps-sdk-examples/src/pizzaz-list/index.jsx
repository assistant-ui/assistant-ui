import { createRoot } from "react-dom/client";
import markers from "../pizzaz/markers.json";
import { PlusCircle, Star } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

function App() {
  const places = markers?.places || [];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-black/10 bg-white px-4 pb-2 text-black antialiased sm:rounded-3xl">
      <div className="max-w-full">
        <div className="flex flex-row items-center gap-4 border-black/5 border-b py-4 sm:gap-4">
          <div
            className="aspect-square w-16 rounded-xl bg-center bg-cover sm:w-18"
            style={{
              backgroundImage:
                "url(https://persistent.oaistatic.com/pizzaz/title.png)",
            }}
          ></div>
          <div>
            <div className="font-medium text-base sm:text-xl">
              National Best Pizza List
            </div>
            <div className="text-black/60 text-sm">
              A ranking of the best pizzerias in the world
            </div>
          </div>
          <div className="hidden flex-auto justify-end pr-2 sm:flex">
            <Button color="primary" variant="solid" size="md">
              Save List
            </Button>
          </div>
        </div>
        <div className="flex min-w-full flex-col text-sm">
          {places.slice(0, 7).map((place, i) => (
            <div
              key={place.id}
              className="-mx-2 rounded-2xl px-3 hover:bg-black/5"
            >
              <div
                style={{
                  borderBottom:
                    i === 7 - 1 ? "none" : "1px solid rgba(0, 0, 0, 0.05)",
                }}
                className="flex w-full items-center gap-2 hover:border-black/0!"
              >
                <div className="w-full min-w-0 py-3 pr-3 sm:w-3/5">
                  <div className="flex items-center gap-3">
                    <Image
                      src={place.thumbnail}
                      alt={place.name}
                      className="h-10 w-10 rounded-lg object-cover ring ring-black/5 sm:h-11 sm:w-11"
                    />
                    <div className="hidden w-3 text-end text-black/40 text-sm sm:block">
                      {i + 1}
                    </div>
                    <div className="flex h-full min-w-0 flex-col items-start sm:pl-1">
                      <div className="max-w-[40ch] truncate font-medium text-sm sm:text-md">
                        {place.name}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-black/70 text-sm sm:mt-0.25">
                        <div className="flex items-center gap-1">
                          <Star
                            strokeWidth={1.5}
                            className="h-3 w-3 text-black"
                          />
                          <span>
                            {place.rating?.toFixed
                              ? place.rating.toFixed(1)
                              : place.rating}
                          </span>
                        </div>
                        <div className="whitespace-nowrap sm:hidden">
                          {place.city || "–"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hidden flex-auto whitespace-nowrap px-3 py-2 text-end text-black/60 text-sm sm:block">
                  {place.city || "–"}
                </div>
                <div className="flex justify-end whitespace-nowrap py-2">
                  <Button
                    aria-label={`Add ${place.name}`}
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    uniform
                  >
                    <PlusCircle strokeWidth={1.5} className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {places.length === 0 && (
            <div className="py-6 text-center text-black/60">
              No pizzerias found.
            </div>
          )}
        </div>
        <div className="px-0 pt-2 pb-2 sm:hidden">
          <Button color="primary" variant="solid" size="md" block>
            Save List
          </Button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("pizzaz-list-root")).render(<App />);
