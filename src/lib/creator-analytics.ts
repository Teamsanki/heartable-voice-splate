import { onValue, ref } from "firebase/database";
import { db } from "./firebase";

export type CreatorPostAnalytics = {
  postId: string;
  caption: string;
  createdAt: number;
  dm: number;
  story: number;
  replays: number;
};

export function listenCreatorAnalytics(uid: string, cb: (rows: CreatorPostAnalytics[]) => void) {
  let posts: Record<string, { caption: string; createdAt: number }> = {};
  let events: Record<string, Record<string, { channel: string; createdAt: number }>> = {};
  const emit = () => cb(Object.entries(posts).map(([postId, post]) => {
    const postEvents = Object.values(events[postId] || {});
    return {
      postId,
      ...post,
      dm: postEvents.filter((event) => event.channel === "dm").length,
      story: postEvents.filter((event) => event.channel === "story").length,
      replays: postEvents.filter((event) => event.channel === "replay").length,
    };
  }).sort((a, b) => b.createdAt - a.createdAt));

  const offPosts = onValue(ref(db, "feed"), (snap) => {
    posts = {};
    snap.forEach((child) => {
      const value = child.val();
      if (value?.uid === uid && child.key) posts[child.key] = { caption: value.caption || value.text || "Voice post", createdAt: value.createdAt || 0 };
    });
    emit();
  });
  const offEvents = onValue(ref(db, `shareEvents/${uid}`), (snap) => {
    events = snap.val() || {};
    emit();
  });
  return () => { offPosts(); offEvents(); };
}