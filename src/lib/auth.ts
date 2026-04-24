import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

const EMAIL_LS_KEY = "cinetrack_email_for_signin";

export async function signInGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function sendEmailLink(email: string): Promise<void> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const actionCodeSettings = {
    url: `${origin}/finish-signin`,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  try {
    window.localStorage.setItem(EMAIL_LS_KEY, email);
  } catch {
    // ignore
  }
}

export function isEmailSignInLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

export async function finishEmailLink(url: string, emailFromInput?: string): Promise<User> {
  let email = emailFromInput;
  if (!email) {
    try {
      email = window.localStorage.getItem(EMAIL_LS_KEY) || undefined;
    } catch {
      // ignore
    }
  }
  if (!email) {
    throw new Error("Missing email. Ask the user to re-enter the email used to sign in.");
  }
  const result = await signInWithEmailLink(auth, email, url);
  try {
    window.localStorage.removeItem(EMAIL_LS_KEY);
  } catch {
    // ignore
  }
  return result.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}
