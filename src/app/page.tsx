"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function PasscodePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { login, isAuthenticated } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace("/home");
  }, [isAuthenticated, router]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutEnd - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setLockoutEnd(null);
        setAttempts(0);
        setError("");
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockoutEnd]);

  const isLocked = lockoutEnd !== null && Date.now() < lockoutEnd;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const passcode = process.env.NEXT_PUBLIC_PASSCODE || "2580";
    if (code === passcode) {
      login(code);
      router.push("/home");
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutEnd(Date.now() + LOCKOUT_SECONDS * 1000);
        setError(`Too many attempts. Locked for ${LOCKOUT_SECONDS}s`);
      } else {
        setError(`Invalid passcode (${MAX_ATTEMPTS - newAttempts} attempts left)`);
      }

      setShake(true);
      setTimeout(() => setShake(false), 500);
      setCode("");
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cinema-purple/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cinema-gold/5 rounded-full blur-3xl" />
      </div>

      <div className={`relative w-full max-w-sm animate-fade-in ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass mb-4 animate-pulse-glow">
            <span className="text-4xl">🎬</span>
          </div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-gradient-gold">
            CineTrack
          </h1>
          <p className="text-cinema-muted text-sm mt-2">Enter passcode to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(val);
                if (!isLocked) setError("");
              }}
              placeholder="● ● ● ●"
              maxLength={6}
              disabled={isLocked}
              className="w-full text-center text-2xl tracking-[0.5em] py-4 px-6 rounded-2xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-border placeholder:tracking-[0.3em] focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-cinema-red text-sm text-center animate-fade-in">
              {error}
              {isLocked && countdown > 0 && <span className="ml-1 font-mono">({countdown}s)</span>}
            </p>
          )}

          <button
            type="submit"
            disabled={code.length < 4 || isLocked}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed gradient-gold text-cinema-bg hover:opacity-90 active:scale-[0.98]"
          >
            {isLocked ? `Locked (${countdown}s)` : "Unlock"}
          </button>
        </form>

        <p className="text-cinema-muted/40 text-xs text-center mt-6">
          Your personal movie tracker
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
      `}</style>
    </div>
  );
}
