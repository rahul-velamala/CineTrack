"use client";

import { useParams } from "next/navigation";
import TitleDetail from "@/components/TitleDetail";

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  return <TitleDetail type="movie" id={id} />;
}
