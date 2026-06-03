import { get, onValue, ref, remove, set, update } from "firebase/database";
import { db, VOICE_ROOT, ADMIN_EMAIL } from "./firebase";

/** Site owner / founder email (hard-coded — single owner). */
export const FOUNDER_EMAIL = "schoudhary11256@gmail.com";

export type AdminRole = "support" | "moderator" | "manager" | "full";
export type AdminEntry = {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  addedBy: string;
  addedAt: number;
};

export const ROLE_LABEL: Record<AdminRole, string> = {
  support: "Support",
  moderator: "Moderator",
  manager: "Manager",
  full: "Full access",
};

/** Permissions per role — used by admin panel tabs visibility. */
export const ROLE_PERMS: Record<AdminRole, { tickets: boolean; reports: boolean; broadcast: boolean; site: boolean; admins: boolean; rewards: boolean; users: boolean }> = {
  support:   { tickets: true,  reports: false, broadcast: false, site: false, admins: false, rewards: false, users: false },
  moderator: { tickets: true,  reports: true,  broadcast: false, site: false, admins: false, rewards: false, users: true  },
  manager:   { tickets: true,  reports: true,  broadcast: true,  site: false, admins: false, rewards: true,  users: true  },
  full:      { tickets: true,  reports: true,  broadcast: true,  site: true,  admins: false, rewards: true,  users: true  },
};

export function isFounder(email?: string | null) {
  if (!email) return false;
  return email.toLowerCase() === FOUNDER_EMAIL.toLowerCase() ||
         email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function listenIsAdmin(uid: string, cb: (entry: AdminEntry | null) => void) {
  return onValue(ref(db, `admins/${uid}`), (s) => cb(s.exists() ? ({ uid, ...(s.val() as any) }) : null));
}

export function listenAllAdmins(cb: (list: AdminEntry[]) => void) {
  return onValue(ref(db, "admins"), (snap) => {
    const out: AdminEntry[] = [];
    snap.forEach((c) => { out.push({ uid: c.key!, ...(c.val() as any) }); });
    cb(out.sort((a, b) => b.addedAt - a.addedAt));
  });
}

export async function addAdmin(byUid: string, target: { uid: string; email: string; name: string }, role: AdminRole) {
  await set(ref(db, `admins/${target.uid}`), {
    email: target.email,
    name: target.name,
    role,
    addedBy: byUid,
    addedAt: Date.now(),
  });
}

export async function updateAdminRole(uid: string, role: AdminRole) {
  await update(ref(db, `admins/${uid}`), { role });
}

export async function removeAdmin(uid: string) {
  await remove(ref(db, `admins/${uid}`));
}

/** Find a user by email (linear scan of voice/{uid}/profile). */
export async function findUserByEmail(email: string): Promise<{ uid: string; name: string; email: string } | null> {
  const snap = await get(ref(db, VOICE_ROOT));
  let found: any = null;
  snap.forEach((c) => {
    const p = c.child("profile").val();
    if (p && p.email && String(p.email).toLowerCase() === email.toLowerCase()) {
      found = { uid: c.key!, name: p.name || "User", email: p.email };
    }
  });
  return found;
}