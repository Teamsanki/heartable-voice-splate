import { onValue, ref, runTransaction } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

/** Interest signal per category (sad / funny / love / …) built from what you engage with. */
export async function bumpAffinity(uid: string, category?: string | null, weight = 1) {
  const c = (category || "other").toLowerCase();
  await runTransaction(ref(db, `${VOICE_ROOT}/${uid}/affinity/${c}`), (n: any) => (n || 0) + weight);
}

export function listenAffinity(uid: string, cb: (m: Record<string, number>) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${uid}/affinity`), (s) => cb((s.val() as any) || {}));
}

/** Stable-per-session random so the order doesn't jump on every re-render. */
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Instagram-ish ranking: freshness + engagement + your category affinity + shuffle noise.
 */
export function rankForYou<T extends { id: string; category?: string; likeCount?: number; commentCount?: number; createdAt?: number }>(
  items: T[],
  affinity: Record<string, number>,
  sessionSeed: string,
): T[] {
  const maxAff = Math.max(1, ...Object.values(affinity || {}));
  const now = Date.now();
  return [...items]
    .map((it) => {
      const cat = (it.category || "other").toLowerCase();
      const aff = (affinity?.[cat] || 0) / maxAff;              // 0..1
      const ageH = Math.max(0, (now - (it.createdAt || now)) / 3.6e6);
      const fresh = 1 / (1 + ageH / 12);                         // decays over ~half day
      const eng = Math.log1p((it.likeCount || 0) * 2 + (it.commentCount || 0) * 3) / 5;
      const noise = seededRandom(sessionSeed + it.id);           // shuffle
      return { it, score: aff * 1.6 + fresh * 1.2 + eng * 1.0 + noise * 0.9 };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}
