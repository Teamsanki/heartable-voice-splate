import { onValue, ref, set } from "firebase/database";
import { db } from "./firebase";

export function listenBeta(cb: (on: boolean) => void) {
  return onValue(ref(db, "siteConfig/beta"), (s) => cb(!!s.val()));
}

export async function setBeta(on: boolean) {
  await set(ref(db, "siteConfig/beta"), on);
}