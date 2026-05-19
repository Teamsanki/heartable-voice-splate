import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBR0yTziYP1T9WkdhNN6VAwebJmYSyrgqo",
  authDomain: "sanki-112566.firebaseapp.com",
  databaseURL: "https://sanki-112566-default-rtdb.firebaseio.com",
  projectId: "sanki-112566",
  storageBucket: "sanki-112566.firebasestorage.app",
  messagingSenderId: "259312660612",
  appId: "1:259312660612:web:324834f8a80409072d92d1",
  measurementId: "G-02VMTGR7W4",
};

export const VOICE_ROOT = "voice";

const isBrowser = typeof window !== "undefined";

// Initialize only on browser. On SSR these will be undefined and any caller
// must guard with isBrowser (all our callers run inside useEffect / event
// handlers, so this is safe).
export const app = isBrowser
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : (null as any);
export const auth = isBrowser ? getAuth(app) : (null as any);
export const db = isBrowser ? getDatabase(app) : (null as any);
export const storage = isBrowser ? getStorage(app) : (null as any);
