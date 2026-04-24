"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { media, titleHref, type PersonDetail, type PersonCredit } from "@/lib/media";

type SortKey = "rating" | "year" | "popularity";

export default function PersonPage() {
  const params = useParams();
  const id = params.id as string;
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [credits, setCredits] = useState<PersonCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("rating");
  const [showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const [p, c] = await Promise.all([
          media.getPerson(id),
          media.getPersonCredits(id),
        ]);
        if (cancelled) return;
        setPerson(p);
        setCredits(c);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) run();
    return () => { cancelled = true; };
  }, [id]);

  const sortedCredits = [...credits].sort((a, b) => {
    if (sort === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
    if (sort === "year") return parseInt(b.year || "0", 10) - parseInt(a.year || "0", 10);
    return 0;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-72 aspect-[2/3] rounded-2xl skeleton" />
              <div className="flex-1 space-y-4">
                <div className="h-8 w-2/3 rounded-lg skeleton" />
                <div className="h-4 w-1/3 rounded skeleton" />
                <div className="h-32 rounded-xl skeleton" />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!person) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl">😕</span>
          <p className="text-cinema-muted">Person not found</p>
          <Link href="/home" className="text-cinema-purple hover:underline text-sm">← Back to search</Link>
        </main>
      </>
    );
  }

  const bio = person.biography || "";
  const bioTruncated = bio.length > 420 && !showFullBio ? bio.slice(0, 420) + "…" : bio;
  const age = (() => {
    if (!person.birthday) return null;
    const end = person.deathday ? new Date(person.deathday) : new Date();
    const start = new Date(person.birthday);
    let a = end.getFullYear() - start.getFullYear();
    const m = end.getMonth() - start.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < start.getDate())) a--;
    return a;
  })();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Link href="/home" className="inline-flex items-center gap-1 text-cinema-muted hover:text-cinema-text text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
            <div className="flex-shrink-0 w-full md:w-72">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-cinema-border/30">
                <Image
                  src={person.profileUrl}
                  alt={person.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 288px"
                  className="object-cover"
                  unoptimized
                  priority
                />
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-display)] leading-tight">{person.name}</h1>
                {person.knownForDepartment && (
                  <p className="text-cinema-muted mt-2">{person.knownForDepartment}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {person.birthday && (
                  <div>
                    <span className="text-cinema-muted">Born</span>
                    <p className="text-cinema-text mt-0.5">
                      {person.birthday}{age !== null && !person.deathday && ` (age ${age})`}
                    </p>
                  </div>
                )}
                {person.deathday && (
                  <div>
                    <span className="text-cinema-muted">Died</span>
                    <p className="text-cinema-text mt-0.5">{person.deathday}{age !== null && ` (age ${age})`}</p>
                  </div>
                )}
                {person.placeOfBirth && (
                  <div>
                    <span className="text-cinema-muted">From</span>
                    <p className="text-cinema-text mt-0.5">{person.placeOfBirth}</p>
                  </div>
                )}
              </div>

              {bio && (
                <div>
                  <h2 className="text-sm font-semibold text-cinema-muted uppercase tracking-wider mb-2">Biography</h2>
                  <p className="text-cinema-text/80 leading-relaxed whitespace-pre-line">{bioTruncated}</p>
                  {bio.length > 420 && (
                    <button
                      onClick={() => setShowFullBio((s) => !s)}
                      className="text-cinema-purple text-sm hover:underline mt-2 cursor-pointer"
                    >
                      {showFullBio ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
                <span>🎞️</span> Filmography
                <span className="text-cinema-muted text-sm font-normal">({credits.length})</span>
              </h2>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-cinema-surface border border-cinema-border/50 text-cinema-text focus:outline-none focus:border-cinema-purple cursor-pointer"
              >
                <option value="rating">Rating</option>
                <option value="year">Year</option>
                <option value="popularity">Default</option>
              </select>
            </div>

            {credits.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sortedCredits.map((c, index) => (
                  <div key={`${c.mediaType}-${c.id}`} className="animate-fade-in" style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}>
                    <MovieCard movie={media.toMovie(c)} href={titleHref(c.mediaType, c.id)} />
                    {(c.character || c.job) && (
                      <p className="text-xs text-cinema-muted mt-1 px-1 line-clamp-1">
                        {c.job ? c.job : `as ${c.character}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cinema-muted text-sm text-center py-12">No filmography available.</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
