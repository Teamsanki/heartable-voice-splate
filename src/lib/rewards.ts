import { get, onValue, push, ref, set, update } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

export type MilestoneTask = {
  id: string;
  title: string;
  description: string;
  target: number;     // numeric goal (e.g. 5 posts, 100 likes)
  metric: "posts" | "likes" | "follows" | "comments" | "shares" | "streak";
  rewardLabel: string; // e.g. "₹50 gift card"
};

export type WeeklyMilestone = {
  id: string;
  weekOf: number;     // unix ts of Monday 00:00
  tasks: MilestoneTask[];
  createdAt: number;
  createdBy: string;
  giftPool: string;   // e.g. "₹100 random gift to 10 winners"
};

export function listenCurrentMilestone(cb: (m: WeeklyMilestone | null) => void) {
  return onValue(ref(db, "rewards/current"), (s) => cb(s.exists() ? (s.val() as WeeklyMilestone) : null));
}

export async function setCurrentMilestone(m: WeeklyMilestone) {
  await set(ref(db, "rewards/current"), m);
  await set(ref(db, `rewards/history/${m.id}`), m);
}

/** Record progress when a user completes part of a milestone. */
export async function claimReward(uid: string, milestoneId: string, taskId: string) {
  const node = push(ref(db, `rewards/claims/${milestoneId}/${uid}`));
  await set(node, { taskId, at: Date.now(), status: "pending" });
  return node.key!;
}

export function listenMyProgress(uid: string, milestoneId: string, cb: (claims: any[]) => void) {
  return onValue(ref(db, `rewards/claims/${milestoneId}/${uid}`), (snap) => {
    const out: any[] = [];
    snap.forEach((c) => out.push({ id: c.key!, ...(c.val() as any) }));
    cb(out);
  });
}

export function listenGiveaways(cb: (list: any[]) => void) {
  return onValue(ref(db, "rewards/giveaways"), (snap) => {
    const out: any[] = [];
    snap.forEach((c) => out.push({ id: c.key!, ...(c.val() as any) }));
    cb(out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  });
}

export async function createGiveaway(opts: {
  title: string;
  description: string;
  prize: string;
  endsAt: number;
  byUid: string;
}) {
  const node = push(ref(db, "rewards/giveaways"));
  await set(node, { ...opts, createdAt: Date.now(), entries: {}, winner: null });
  return node.key!;
}

export async function enterGiveaway(giveawayId: string, uid: string, name: string) {
  await set(ref(db, `rewards/giveaways/${giveawayId}/entries/${uid}`), { name, at: Date.now() });
}

export async function pickGiveawayWinner(giveawayId: string) {
  const snap = await get(ref(db, `rewards/giveaways/${giveawayId}/entries`));
  const entries: { uid: string; name: string }[] = [];
  snap.forEach((c) => entries.push({ uid: c.key!, name: c.child("name").val() || "Winner" }));
  if (entries.length === 0) return null;
  const win = entries[Math.floor(Math.random() * entries.length)];
  await update(ref(db, `rewards/giveaways/${giveawayId}`), { winner: win });
  return win;
}

export async function ensureUserMetrics(uid: string) {
  // Stub: counts come from userStats already; helper kept for future expansion.
  return get(ref(db, `userStats/${uid}`)).then((s) => s.val() || {});
}

export async function getNextSundayMidnight(): Promise<number> {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const daysUntilSunday = (7 - day) % 7 || 7;
  const d = new Date(now);
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}