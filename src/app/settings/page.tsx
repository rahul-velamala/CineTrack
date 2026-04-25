"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  changeHandle,
  getHandleChangeStatus,
  updateProfile,
  validateHandle,
  type ProfileVisibility,
} from "@/lib/userStore";

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, profile, authLoading, watchlist, watched, signOut } = useApp();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("basic");
  const [watchlistPublic, setWatchlistPublic] = useState(true);
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [activityFeedPublic, setActivityFeedPublic] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newHandle, setNewHandle] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);

  // Hydrate form from profile
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setBio(profile.bio ?? "");
    setPhotoURL(profile.photoURL ?? "");
    setVisibility((profile.profileVisibility ?? "basic") as ProfileVisibility);
    setWatchlistPublic(profile.watchlistPublic ?? true);
    setNotifyByEmail(profile.notifyByEmail ?? false);
    setActivityFeedPublic(profile.activityFeedPublic ?? false);
  }, [profile]);

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">
          <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
            <span className="text-5xl">⚙️</span>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Sign in to manage settings</h1>
            <Link href="/home" className="inline-block mt-4 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all">Back to home</Link>
          </div>
        </main>
      </>
    );
  }

  const handleStatus = getHandleChangeStatus(profile);

  const saveProfile = async () => {
    setSavingProfile(true);
    const res = await updateProfile(user.uid, {
      displayName,
      bio,
      photoURL,
      profileVisibility: visibility,
      watchlistPublic,
      notifyByEmail,
      activityFeedPublic,
    });
    setSavingProfile(false);
    if (res.ok) toast.success("Settings saved");
    else toast.error(res.error);
  };

  const saveHandle = async () => {
    if (!profile) return;
    setHandleError(null);
    const v = validateHandle(newHandle);
    if (!v.ok) { setHandleError(v.error); return; }
    setSavingHandle(true);
    const res = await changeHandle(user.uid, profile, v.handle);
    setSavingHandle(false);
    if (res.ok) {
      toast.success(`Handle changed to @${v.handle}`);
      setNewHandle("");
    } else {
      setHandleError(res.error);
    }
  };

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({
        profile,
        watchlist,
        watched,
        exportedAt: new Date().toISOString(),
      }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinetrack-${profile?.handle || user.uid}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link href="/home" className="text-xs text-cinema-muted hover:text-cinema-text transition-colors">← Back to home</Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mt-2 mb-8 flex items-center gap-3">
            <span>⚙️</span> Settings
          </h1>

          <Section title="Profile">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
                {photoURL ? (
                  <Image src={photoURL} alt="avatar" fill sizes="64px" className="object-cover" unoptimized />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {(displayName || user.email || "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-xs text-cinema-muted">
                Use a public image URL for now. Direct upload coming with chat phase.
              </div>
            </div>

            <Field label="Display name" max={DISPLAY_NAME_MAX} value={displayName}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, DISPLAY_NAME_MAX))}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
              />
            </Field>

            <Field label="Bio" max={BIO_MAX} value={bio}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                rows={3}
                placeholder="Tell people what you watch..."
                className="w-full px-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50 resize-none"
              />
            </Field>

            <Field label="Photo URL">
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
              />
            </Field>
          </Section>

          <Section title="Privacy">
            <p className="text-xs text-cinema-muted mb-3">Control what other people can see on your public profile.</p>
            <div className="space-y-2">
              <Radio
                checked={visibility === "basic"}
                onChange={() => setVisibility("basic")}
                title="Basic visibility (recommended)"
                desc="Anyone sees your name, handle, photo, and counts. Good for sharing on Instagram & finding friends."
              />
              <Radio
                checked={visibility === "friends"}
                onChange={() => setVisibility("friends")}
                title="Friends only"
                desc="Only your accepted friends see your full profile. Strangers can still find you by handle to send a request."
              />
              <Radio
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
                title="Private"
                desc="Profile page is hidden. Only you see your data. Friends can still chat & send recs."
              />
            </div>

            <div className="mt-4 pt-4 border-t border-cinema-border/30 space-y-3">
              <Toggle
                checked={watchlistPublic}
                onChange={setWatchlistPublic}
                label="Show watchlist on my public profile"
                disabled={visibility === "private"}
              />
              <Toggle
                checked={activityFeedPublic}
                onChange={setActivityFeedPublic}
                label="Share my activity with friends (what I watch / add)"
              />
            </div>
          </Section>

          <Section title="Notifications">
            <Toggle
              checked={notifyByEmail}
              onChange={setNotifyByEmail}
              label="Email me about friend requests & inbox recs"
            />
            <p className="text-[11px] text-cinema-muted mt-2">
              Web push is on by default once you grant permission. Email is opt-in.
            </p>
          </Section>

          <div className="flex justify-end mb-8">
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {savingProfile ? "Saving..." : "Save changes"}
            </button>
          </div>

          <Section title="Change handle">
            {profile?.handle ? (
              <p className="text-xs text-cinema-muted mb-3">
                Current: <span className="text-cinema-purple">@{profile.handle}</span>
              </p>
            ) : (
              <p className="text-xs text-cinema-muted mb-3">No handle yet. Pick one to be findable by friends.</p>
            )}

            {handleStatus.cooldownActive && (
              <p className="text-xs text-cinema-gold mb-3">
                You can change again in {handleStatus.daysRemaining} day(s).
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-cinema-muted">@</span>
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => { setNewHandle(e.target.value); setHandleError(null); }}
                  placeholder={profile?.handle ? "newhandle" : "yourhandle"}
                  maxLength={20}
                  disabled={handleStatus.cooldownActive}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50 disabled:opacity-50"
                />
              </div>
              <button
                onClick={saveHandle}
                disabled={savingHandle || handleStatus.cooldownActive || !newHandle.trim()}
                className="px-5 py-3 rounded-xl font-semibold text-sm bg-cinema-surface border border-cinema-border hover:border-cinema-purple/50 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {savingHandle ? "Claiming..." : "Claim"}
              </button>
            </div>
            {handleError && <p className="text-cinema-red text-xs mt-2">{handleError}</p>}
            <p className="text-[11px] text-cinema-muted mt-3">
              You can change your handle once every 21 days. Old handle becomes available for others.
            </p>
          </Section>

          <Section title="Your data">
            <p className="text-xs text-cinema-muted mb-3">Download a JSON copy of everything you have on CineTrack.</p>
            <button
              onClick={exportData}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-cinema-surface border border-cinema-border hover:border-cinema-purple/50 transition-all cursor-pointer"
            >
              Export my data
            </button>
            <p className="text-[11px] text-cinema-muted mt-4">
              Account deletion is coming. Until then, contact the site owner to delete your data.
            </p>
          </Section>

          <Section title="Account" border={false}>
            <button
              onClick={async () => { await signOut(); router.push("/home"); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-cinema-red/15 text-cinema-red border border-cinema-red/30 hover:bg-cinema-red/25 transition-all cursor-pointer"
            >
              Sign out
            </button>
          </Section>
        </div>
      </main>
    </>
  );
}

function Section({ title, children, border = true }: { title: string; children: React.ReactNode; border?: boolean }) {
  return (
    <section className={`mb-8 ${border ? "pb-8 border-b border-cinema-border/30" : ""}`}>
      <h2 className="text-sm uppercase tracking-wider text-cinema-muted mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children, max, value }: { label: string; children: React.ReactNode; max?: number; value?: string }) {
  return (
    <label className="block mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-cinema-text">{label}</span>
        {max !== undefined && value !== undefined && (
          <span className="text-[10px] text-cinema-muted">{value.length}/{max}</span>
        )}
      </div>
      {children}
    </label>
  );
}

function Radio({ checked, onChange, title, desc }: { checked: boolean; onChange: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onChange}
      type="button"
      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left border transition-all cursor-pointer ${
        checked
          ? "bg-cinema-purple/10 border-cinema-purple/50"
          : "bg-cinema-surface border-cinema-border/50 hover:border-cinema-purple/30"
      }`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
        checked ? "border-cinema-purple bg-cinema-purple" : "border-cinema-border"
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-cinema-text">{title}</p>
        <p className="text-xs text-cinema-muted mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border bg-cinema-surface border-cinema-border/50 hover:border-cinema-purple/30 transition-all cursor-pointer disabled:opacity-50`}
    >
      <span className="text-sm text-cinema-text">{label}</span>
      <span className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-cinema-purple" : "bg-cinema-border"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </span>
    </button>
  );
}
