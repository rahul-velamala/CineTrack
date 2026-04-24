"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { finishEmailLink, isEmailSignInLink } from "@/lib/auth";

type State =
  | { kind: "loading" }
  | { kind: "needsEmail" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function FinishSignIn() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function run() {
      const url = window.location.href;
      if (!isEmailSignInLink(url)) {
        setState({ kind: "error", message: "This link is not a valid sign-in link." });
        return;
      }
      try {
        await finishEmailLink(url);
        setState({ kind: "success" });
        setTimeout(() => router.replace("/home"), 900);
      } catch (err) {
        if (err instanceof Error && err.message.includes("Missing email")) {
          setState({ kind: "needsEmail" });
        } else {
          console.error(err);
          setState({ kind: "error", message: "Sign-in failed. The link may have expired." });
        }
      }
    }
    run();
  }, [router]);

  const submitEmail = async () => {
    setState({ kind: "loading" });
    try {
      await finishEmailLink(window.location.href, email);
      setState({ kind: "success" });
      setTimeout(() => router.replace("/home"), 900);
    } catch (err) {
      console.error(err);
      setState({ kind: "error", message: "Sign-in failed. Check the email and try again." });
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-cinema-card border border-cinema-border shadow-2xl shadow-black/50 p-6 text-center space-y-4">
          {state.kind === "loading" && (
            <>
              <div className="w-10 h-10 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-cinema-text font-semibold">Signing you in...</p>
            </>
          )}

          {state.kind === "needsEmail" && (
            <>
              <span className="text-4xl inline-block">✉️</span>
              <h2 className="text-lg font-bold font-[family-name:var(--font-display)]">Confirm your email</h2>
              <p className="text-cinema-muted text-xs">For security, re-enter the email you used to request this link.</p>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitEmail(); }}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
              />
              <button
                onClick={submitEmail}
                className="w-full py-3 rounded-xl font-semibold text-sm gradient-gold text-cinema-bg hover:opacity-90 transition-all cursor-pointer"
              >
                Finish sign-in
              </button>
            </>
          )}

          {state.kind === "success" && (
            <>
              <span className="text-4xl inline-block">✅</span>
              <p className="text-cinema-text font-semibold">Signed in. Redirecting...</p>
            </>
          )}

          {state.kind === "error" && (
            <>
              <span className="text-4xl inline-block">😕</span>
              <p className="text-cinema-text font-semibold">{state.message}</p>
              <Link href="/home" className="inline-block text-cinema-purple text-sm hover:underline">Back to home</Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
