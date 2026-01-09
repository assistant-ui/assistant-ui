import { motion } from "framer-motion";
import { Star, X } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

export default function Inspector({ place, onClose }) {
  if (!place) return null;
  return (
    <motion.div
      key={place.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", bounce: 0, duration: 0.25 }}
      className="pizzaz-inspector pointer-events-auto absolute top-0 right-auto bottom-4 left-0 z-30 w-[340px] md:z-20 xl:top-6 xl:right-6 xl:bottom-8 xl:left-auto xl:w-[360px]"
    >
      <Button
        aria-label="Close details"
        className="absolute top-4 left-4 z-10 inline-flex rounded-full bg-white p-2 shadow-xl ring ring-black/10 hover:bg-white xl:top-4 xl:left-4 xl:shadow-2xl"
        variant="soft"
        color="secondary"
        size="sm"
        uniform
        onClick={onClose}
      >
        <X className="h-[18px] w-[18px]" aria-hidden="true" />
      </Button>
      <div className="relative h-full overflow-y-auto rounded-none bg-white text-black ring-black/10 xl:rounded-3xl xl:shadow-xl xl:ring">
        <div className="relative mt-2 px-2 xl:mt-0 xl:px-0">
          <Image
            src={place.thumbnail}
            alt={place.name}
            className="h-80 w-full rounded-3xl object-cover xl:rounded-none xl:rounded-t-2xl"
          />
        </div>

        <div className="h-[calc(100%-11rem)] sm:h-[calc(100%-14rem)]">
          <div className="p-4 sm:p-5">
            <div className="truncate font-medium text-2xl">{place.name}</div>
            <div className="mt-1 flex items-center gap-1 text-sm opacity-70">
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              {place.rating.toFixed(1)}
              {place.price ? <span>· {place.price}</span> : null}
              <span>· San Francisco</span>
            </div>
            <div className="mt-3 flex flex-row items-center gap-3 font-medium">
              <Button color="primary" variant="solid" size="sm">
                {" "}
                Add to favorites
              </Button>
              <Button
                color="primary"
                variant="outline"
                size="sm"
                className="border-[#F46C21]/50 text-[#F46C21]"
              >
                Contact
              </Button>
            </div>
            <div className="mt-5 text-sm">
              {place.description} Enjoy a slice at one of SF's favorites. Fresh
              ingredients, great crust, and cozy vibes.
            </div>
          </div>

          <div className="px-4 pb-4 sm:px-5">
            <div className="mb-2 font-medium text-lg">Reviews</div>
            <ul className="space-y-3 divide-y divide-black/5">
              {[
                {
                  user: "Leo M.",
                  avatar: "https://persistent.oaistatic.com/pizzaz/user1.png",
                  text: "Fantastic crust and balanced toppings. The marinara is spot on!",
                },
                {
                  user: "Priya S.",
                  avatar: "https://persistent.oaistatic.com/pizzaz/user2.png",
                  text: "Cozy vibe and friendly staff. Quick service on a Friday night.",
                },
                {
                  user: "Maya R.",
                  avatar: "https://persistent.oaistatic.com/pizzaz/user3.png",
                  text: "Great for sharing. Will definitely come back with friends.",
                },
              ].map((review, idx) => (
                <li key={idx} className="py-3">
                  <div className="flex items-start gap-3">
                    <Image
                      src={review.avatar}
                      alt={`${review.user} avatar`}
                      className="h-8 w-8 flex-none rounded-full object-cover ring ring-black/5"
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="font-medium text-black/70 text-xs">
                        {review.user}
                      </div>
                      <div className="text-sm">{review.text}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
