"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TitleDetail from "@/components/TitleDetail";
import type { MediaType } from "@/lib/media";

export default function TitlePage() {
  const params = useParams();
  const rawType = params.type as string;
  const id = params.id as string;

  if (rawType !== "movie" && rawType !== "tv") {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl">😕</span>
          <p className="text-cinema-muted">Unknown title type.</p>
          <Link href="/home" className="text-cinema-purple hover:underline text-sm">← Back to search</Link>
        </main>
      </>
    );
  }

  return <TitleDetail type={rawType as MediaType} id={id} />;
}
