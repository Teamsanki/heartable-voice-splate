import { onValue, push, ref, set, update } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

export type ReportKind = "post" | "user" | "chat" | "story" | "comment";
export type ReportStatus = "open" | "under-review" | "actioned" | "dismissed";
export type Report = {
  id: string;
  kind: ReportKind;
  targetId: string; // postId / userUid / messageId-thread / storyId
  targetUid?: string;
  reporterUid: string;
  reporterName: string;
  reason: string;
  link?: string;
  status: ReportStatus;
  createdAt: number;
};

export async function submitReport(r: Omit<Report, "id" | "status" | "createdAt">) {
  const node = push(ref(db, "reports"));
  const id = node.key;
  if (!id) throw new Error("Could not submit report.");
  const report = { ...r, status: "open" as const, createdAt: Date.now() };
  await update(ref(db), { [`reports/${id}`]: report, [`userReports/${r.reporterUid}/${id}`]: report });
  return id;
}

export function listenReports(cb: (rs: Report[]) => void) {
  return onValue(ref(db, "reports"), (snap) => {
    const out: Report[] = [];
    snap.forEach((c) => { out.push({ id: c.key!, ...(c.val() as any) }); });
    cb(out.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export async function setReportStatus(id: string, status: Report["status"]) {
  const reporterUid = (await import("firebase/database").then(({ get }) => get(ref(db, `reports/${id}/reporterUid`)))).val();
  const patch: Record<string, unknown> = { [`reports/${id}/status`]: status };
  if (reporterUid) patch[`userReports/${reporterUid}/${id}/status`] = status;
  await update(ref(db), patch);
}

export function listenMyReports(uid: string, cb: (reports: Report[]) => void) {
  return onValue(ref(db, `userReports/${uid}`), (snap) => {
    const reports: Report[] = [];
    snap.forEach((child) => { reports.push({ id: child.key as string, ...child.val() }); });
    cb(reports.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export function listenHiddenTargets(uid: string, cb: (targets: Set<string>) => void) {
  return listenMyReports(uid, (reports) => cb(new Set(reports.filter((report) => report.status === "open" || report.status === "under-review").map((report) => report.targetId))));
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