import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getUserProfileByHandle, type UserProfile } from "./userStore";

const PENDING_KEY = "cinetrack_pending_invite_handle";
const ACCEPTED_KEY = "cinetrack_invite_attached";

// Capture an invite handle into pending storage. Call from any client page mount.
export function capturePendingInvite(handle: string): void {
  const trimmed = handle.trim().replace(/^@/, "").toLowerCase();
  if (!trimmed) return;
  try {
    localStorage.setItem(PENDING_KEY, trimmed);
  } catch {
    // ignore
  }
}

export function readPendingInviteHandle(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

// Attach pending invite to user doc (one-time, on first sign-in).
// Returns the inviter profile if attached, else null.
export async function attachInviteOnSignIn(uid: string): Promise<UserProfile | null> {
  let attached = false;
  try { attached = localStorage.getItem(ACCEPTED_KEY) === "1"; } catch { /* ignore */ }
  if (attached) return null;

  const handle = readPendingInviteHandle();
  if (!handle) return null;

  const inviter = await getUserProfileByHandle(handle);
  if (!inviter || inviter.uid === uid) {
    clearPendingInvite();
    return null;
  }

  // Only stamp invitedBy if not already set (don't overwrite)
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? (snap.data() as { invitedBy?: string }).invitedBy : undefined;
    if (!existing) {
      await setDoc(userRef, { invitedBy: inviter.uid, invitedByHandle: inviter.handle }, { merge: true });
    }
  } catch (err) {
    console.error("attachInviteOnSignIn write failed", err);
  }

  clearPendingInvite();
  try { localStorage.setItem(ACCEPTED_KEY, "1"); } catch { /* ignore */ }

  return inviter;
}

// Read invite handle from current URL (?invite=<handle>) and persist
export function captureInviteFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) capturePendingInvite(invite);
  } catch {
    // ignore
  }
}
