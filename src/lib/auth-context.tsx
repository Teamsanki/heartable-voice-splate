import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  linkWithCredential,
  EmailAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { get, ref, set, update } from "firebase/database";
import { auth, db, VOICE_ROOT } from "./firebase";

export type Profile = {
  name: string;
  photo?: string | null;
  isGuest: boolean;
  createdAt: number;
  guestExpiresAt?: number | null;
};

type Ctx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  guestExpired: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, pw: string) => Promise<void>;
  signUpEmail: (email: string, pw: string, name: string) => Promise<void>;
  signInGuest: (name: string) => Promise<void>;
  upgradeGuestEmail: (email: string, pw: string) => Promise<void>;
  upgradeGuestGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

async function ensureProfile(u: User, overrides?: Partial<Profile>): Promise<Profile> {
  const pRef = ref(db, `${VOICE_ROOT}/${u.uid}/profile`);
  const snap = await get(pRef);
  if (snap.exists()) {
    const existing = snap.val() as Profile;
    if (overrides) {
      const merged = { ...existing, ...overrides };
      await update(pRef, overrides);
      return merged;
    }
    return existing;
  }
  const fresh: Profile = {
    name: overrides?.name || u.displayName || (u.isAnonymous ? "Guest" : "Friend"),
    photo: overrides?.photo ?? u.photoURL ?? null,
    isGuest: u.isAnonymous,
    createdAt: Date.now(),
    guestExpiresAt: u.isAnonymous ? Date.now() + SEVEN_DAYS : null,
    ...overrides,
  };
  await set(pRef, fresh);
  return fresh;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await ensureProfile(u);
          setProfile(p);
        } catch (e) {
          console.error("profile load", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isGuest = !!user?.isAnonymous;
  const guestExpired =
    isGuest && !!profile?.guestExpiresAt && profile.guestExpiresAt < Date.now();

  const value: Ctx = {
    user,
    profile,
    loading,
    isGuest,
    guestExpired,
    async signInGoogle() {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      await ensureProfile(res.user, { isGuest: false, guestExpiresAt: null });
    },
    async signInEmail(email, pw) {
      const res = await signInWithEmailAndPassword(auth, email, pw);
      await ensureProfile(res.user, { isGuest: false });
    },
    async signUpEmail(email, pw, name) {
      const res = await createUserWithEmailAndPassword(auth, email, pw);
      if (name) await updateProfile(res.user, { displayName: name });
      await ensureProfile(res.user, { name, isGuest: false, guestExpiresAt: null });
    },
    async signInGuest(name) {
      const res = await signInAnonymously(auth);
      await updateProfile(res.user, { displayName: name });
      await ensureProfile(res.user, {
        name,
        isGuest: true,
        guestExpiresAt: Date.now() + SEVEN_DAYS,
      });
    },
    async upgradeGuestEmail(email, pw) {
      if (!auth.currentUser) throw new Error("Not signed in");
      const cred = EmailAuthProvider.credential(email, pw);
      const res = await linkWithCredential(auth.currentUser, cred);
      await ensureProfile(res.user, { isGuest: false, guestExpiresAt: null });
    },
    async upgradeGuestGoogle() {
      if (!auth.currentUser) throw new Error("Not signed in");
      const res = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
      await ensureProfile(res.user, { isGuest: false, guestExpiresAt: null });
    },
    async signOut() {
      await fbSignOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
