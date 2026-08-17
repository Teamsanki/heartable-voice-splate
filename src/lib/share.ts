import { push, ref, set } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

const DAY = 24 * 60 * 60 * 1000;

/** Firebase rejects `undefined` values — strip them from previews. */
export function cleanPreview<T extends Record<string, any>>(p: T): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(p || {}).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

export type PostPreview = {
  name: string;
  text?: string;
  caption?: string;
  bgCss?: string;
  fgColor?: string;
  fontId?: string;
  type?: string;
  url?: string;
  filter?: string;
  durationSec?: number;
};

/** Instagram-style "Add post to your story". */
export async function sharePostToStory(opts: {
  uid: string;
  name: string;
  photo?: string | null;
  postId: string;
  preview: PostPreview;
}) {
  const node = push(ref(db, `${VOICE_ROOT}/${opts.uid}/stories`));
  await set(node, {
    uid: opts.uid,
    name: opts.name,
    photo: opts.photo || null,
    kind: "post",
    postId: opts.postId,
    postPreview: cleanPreview(opts.preview),
    url: opts.preview.url || "",
    filter: opts.preview.filter || "none",
    durationSec: Math.max(6, Math.round(opts.preview.durationSec || 0)),
    createdAt: Date.now(),
    expiresAt: Date.now() + DAY,
    replays: {},
    reactions: {},
  });
  return node.key!;
}
