import React from "react";
import { createRoot } from "react-dom/client";
import markers from "../pizzaz/markers.json";
import { PlusCircle, Star } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

function App() {
  const places = markers?.places || [];

  return (
    <div className="antialiased w-full text-black px-4 pb-2 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
      <div className="max-w-full">
        <div className="flex flex-row items-center gap-4 sm:gap-4 border-b border-black/5 py-4">
          <div
            className="sm:w-18 w-16 aspect-square rounded-xl bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://persistent.oaistatic.com/pizzaz/title.png)",
            }}
          ></div>
          <div>
            <div className="text-base sm:text-xl font-medium">
              National Best Pizza List
            </div>
            <div className="text-sm text-black/60">
              A ranking of the best pizzerias in the world
            </div>
          </div>
          <div className="flex-auto hidden sm:flex justify-end pr-2">
            <Button color="primary" variant="solid" size="md">
              Save List
            </Button>
          </div>
        </div>
        <div className="min-w-full text-sm flex flex-col">
          {places.slice(0, 7).map((place, i) => (
            <div
              key={place.id}
              className="px-3 -mx-2 rounded-2xl hover:bg-black/5"
            >
              <div
                style={{
                  borderBottom:
                    i === 7 - 1 ? "none" : "1px solid rgba(0, 0, 0, 0.05)",
                }}
                className="flex w-full items-center hover:border-black/0! gap-2"
              >
                <div className="py-3 pr-3 min-w-0 w-full sm:w-3/5">
                  <div className="flex items-center gap-3">
                    <Image
                      src={place.thumbnail}
                      alt={place.name}
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg object-cover ring ring-black/5"
                    />
                    <div className="w-3 text-end sm:block hidden text-sm text-black/40">
                      {i + 1}
                    </div>
                    <div className="min-w-0 sm:pl-1 flex flex-col items-start h-full">
                      <div className="font-medium text-sm sm:text-md truncate max-w-[40ch]">
                        {place.name}
                      </div>
                      <div className="mt-1 sm:mt-0.25 flex items-center gap-3 text-black/70 text-sm">
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
                <div className="hidden sm:block text-end py-2 px-3 text-sm text-black/60 whitespace-nowrap flex-auto">
                  {place.city || "–"}
                </div>
                <div className="py-2 whitespace-nowrap flex justify-end">
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
        <div className="sm:hidden px-0 pt-2 pb-2">
          <Button color="primary" variant="solid" size="md" block>
            Save List
          </Button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("pizzaz-list-root")).render(<App />);
