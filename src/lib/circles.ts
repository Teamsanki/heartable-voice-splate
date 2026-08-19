import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "./firebase";

export type CircleVisibility = "public" | "private";
export type Circle = {
  id: string;
  name: string;
  description: string;
  link?: string;
  handle: string;
  visibility: CircleVisibility;
  createdBy: string;
  createdAt: number;
  inviteCode: string;
  members?: Record<string, true>;
};

export function normalizeCircleHandle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export function listenCircles(uid: string, cb: (circles: Circle[]) => void) {
  return onValue(ref(db, "mehfil"), (snap) => {
    const circles: Circle[] = [];
    snap.forEach((child) => {
      const value = child.val() || {};
      if (value.visibility === "public" || value.members?.[uid]) circles.push({ id: child.key as string, ...value });
    });
    cb(circles.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
  });
}

export async function createCircle(uid: string, input: { name: string; description: string; link?: string; handle: string; visibility: CircleVisibility }) {
  const handle = normalizeCircleHandle(input.handle);
  if (handle.length < 4) throw new Error("Choose a handle with at least 4 characters.");
  const handleRef = ref(db, `circleHandles/${handle}`);
  if ((await get(handleRef)).exists()) throw new Error("That public handle is already taken.");
  const node = push(ref(db, "mehfil"));
  const id = node.key;
  if (!id) throw new Error("Could not create circle.");
  const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const circle: Omit<Circle, "id"> = {
    name: input.name.trim().slice(0, 48),
    description: input.description.trim().slice(0, 240),
    link: input.link?.trim().slice(0, 240) || "",
    handle,
    visibility: input.visibility,
    createdBy: uid,
    createdAt: Date.now(),
    inviteCode,
    members: { [uid]: true },
  };
  await update(ref(db), { [`mehfil/${id}`]: circle, [`circleHandles/${handle}`]: id, [`circleInvites/${inviteCode}`]: id });
  return id;
}

export async function joinCircle(id: string, uid: string, inviteCode?: string) {
  const snap = await get(ref(db, `mehfil/${id}`));
  const circle = snap.val() as Circle | null;
  if (!circle) throw new Error("Circle not found.");
  if (circle.visibility === "private" && circle.inviteCode !== inviteCode) throw new Error("This private circle needs a valid invite link.");
  await set(ref(db, `mehfil/${id}/members/${uid}`), true);
}

export async function leaveCircle(id: string, uid: string) {
  await remove(ref(db, `mehfil/${id}/members/${uid}`));
}

export async function sendCircleText(id: string, uid: string, name: string, text: string) {
  const node = push(ref(db, `mehfil/${id}/messages`));
  await set(node, { kind: "text", uid, name, text: text.trim().slice(0, 1500), createdAt: Date.now() });
}