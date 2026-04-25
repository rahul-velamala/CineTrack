"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { titleHref, type MediaItem } from "@/lib/media";

interface Props {
  items: MediaItem[];
}

export default function Poster3DStrip({ items }: Props) {
  const router = useRouter();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, []);

  if (!items || items.length === 0) return null;

  // Duplicate list for seamless infinite scroll
  const loop = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden py-6 select-none scene-3d" aria-hidden={false}>
      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-cinema-bg to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-cinema-bg to-transparent z-10" />

      <motion.div
        className="flex gap-4 sm:gap-6 preserve-3d"
        style={{ transform: "rotateX(8deg)" }}
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={reduced ? undefined : { duration: 60, ease: "linear", repeat: Infinity }}
      >
        {loop.map((item, idx) => {
          const poster = item.posterUrl && item.posterUrl !== "N/A" ? item.posterUrl : "/no-poster.svg";
          return (
            <motion.button
              key={`${item.mediaType}-${item.id}-${idx}`}
              type="button"
              onClick={() => router.push(titleHref(item.mediaType, item.id))}
              whileHover={{ scale: 1.06, z: 40, transition: { type: "spring", stiffness: 280, damping: 22 } }}
              className="relative flex-shrink-0 w-32 sm:w-40 md:w-48 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer depth-2 hover:depth-glow-indigo border border-cinema-border/50 bg-cinema-card preserve-3d"
              aria-label={item.title}
            >
              <Image
                src={poster}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 128px, (max-width: 1024px) 160px, 192px"
                className="object-cover"
                unoptimized
              />
              {/* Gradient overlay for legibility */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                <p className="text-xs sm:text-sm font-semibold text-white line-clamp-1">{item.title}</p>
                {item.year && <p className="text-[10px] text-white/70">{item.year}</p>}
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
