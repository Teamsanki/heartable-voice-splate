import { get, ref, update } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

export function badgeFor(count: number) {
  if (count >= 100) return "Diamond Mic";
  if (count >= 30) return "Gold Mic";
  if (count >= 7) return "Silver Mic";
  return "Spark Mic";
}

export async function bumpStreak(uid: string) {
  const r = ref(db, `${VOICE_ROOT}/${uid}/streak`);
  const snap = await get(r);
  const today = todayKey();
  const yest = yesterdayKey();
  let count = 1;
  if (snap.exists()) {
    const cur = snap.val() as { count: number; lastDate: string };
    if (cur.lastDate === today) return cur;
    if (cur.lastDate === yest) count = (cur.count || 0) + 1;
  }
  const next = { count, lastDate: today, badge: badgeFor(count) };
  await update(r, next);
  return next;
}

export function shouldRemindStreakBreak(lastDate?: string) {
  if (!lastDate) return false;
  const yest = yesterdayKey();
  const hour = new Date().getHours();
  return lastDate === yest && hour >= 20;
}
