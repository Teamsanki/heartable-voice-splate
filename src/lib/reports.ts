import { onValue, push, ref, set, update } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

export type ReportKind = "post" | "user" | "chat" | "story" | "comment";
export type Report = {
  id: string;
  kind: ReportKind;
  targetId: string; // postId / userUid / messageId-thread / storyId
  targetUid?: string;
  reporterUid: string;
  reporterName: string;
  reason: string;
  link?: string;
  status: "open" | "actioned" | "dismissed";
  createdAt: number;
};

export async function submitReport(r: Omit<Report, "id" | "status" | "createdAt">) {
  const node = push(ref(db, "reports"));
  await set(node, { ...r, status: "open", createdAt: Date.now() });
  return node.key!;
}

export function listenReports(cb: (rs: Report[]) => void) {
  return onValue(ref(db, "reports"), (snap) => {
    const out: Report[] = [];
    snap.forEach((c) => { out.push({ id: c.key!, ...(c.val() as any) }); });
    cb(out.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export async function setReportStatus(id: string, status: Report["status"]) {
  await update(ref(db, `reports/${id}`), { status });
}

/* ----- Bans ----- */
export async function banUser(uid: string, reason: string, byUid: string) {
  await set(ref(db, `${VOICE_ROOT}/${uid}/ban`), { reason, byUid, at: Date.now() });
}
export async function unbanUser(uid: string) {
  await set(ref(db, `${VOICE_ROOT}/${uid}/ban`), null);
}
export function listenMyBan(uid: string, cb: (banned: { reason: string } | null) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${uid}/ban`), (s) => cb(s.val() || null));
}

/* ----- Warnings ----- */
export async function warnUser(uid: string, msg: string, byUid: string) {
  const node = push(ref(db, `${VOICE_ROOT}/${uid}/warnings`));
  await set(node, { msg, byUid, at: Date.now() });
}