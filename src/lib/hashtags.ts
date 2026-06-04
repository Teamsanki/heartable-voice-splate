import { get, onValue, ref, remove, runTransaction, set } from "firebase/database";
import { db } from "./firebase";

/** Extract unique #hashtags (lowercased, ASCII+digits+_) from free text. */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const re = /#([a-zA-Z0-9_\u0900-\u097F]{2,30})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1].toLowerCase());
  return [...out].slice(0, 8);
}

/** Extract @mentions (display names, alphanum + _) — for highlighting only. */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const re = /@([a-zA-Z0-9_]{2,30})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1]);
  return [...out].slice(0, 8);
}

/** Index a post under its hashtags + bump global counters. Idempotent per call. */
export async function indexPostHashtags(postId: string, text: string, createdAt: number) {
  const tags = extractHashtags(text);
  await Promise.all(tags.map(async (t) => {
    await set(ref(db, `hashtags/posts/${t}/${postId}`), createdAt || Date.now());
    await runTransaction(ref(db, `hashtags/counts/${t}`), (n: any) => (n || 0) + 1);
  }));
  return tags;
}

/** Listen to all hashtag counts; returns sorted desc array. */
export function listenTrendingTags(cb: (tags: { tag: string; count: number }[]) => void) {
  return onValue(ref(db, "hashtags/counts"), (snap) => {
    const out: { tag: string; count: number }[] = [];
    snap.forEach((c) => { out.push({ tag: c.key!, count: Number(c.val()) || 0 }); });
    cb(out.sort((a, b) => b.count - a.count).slice(0, 20));
  });
}

/** Listen to post IDs for a given tag, newest first. */
export function listenPostsForTag(tag: string, cb: (ids: string[]) => void) {
  return onValue(ref(db, `hashtags/posts/${tag.toLowerCase()}`), (snap) => {
    const out: { id: string; at: number }[] = [];
    snap.forEach((c) => { out.push({ id: c.key!, at: Number(c.val()) || 0 }); });
    cb(out.sort((a, b) => b.at - a.at).map((x) => x.id));
  });
}

export async function fetchPostById(postId: string) {
  const s = await get(ref(db, `feed/${postId}`));
  return s.exists() ? { id: postId, ...(s.val() as any) } : null;
}