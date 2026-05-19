import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCEdkofdgb8-n7cOoGem04NnvmmHpYFY10",
  authDomain: "heartable-voice.firebaseapp.com",
  databaseURL: "https://heartable-voice-default-rtdb.firebaseio.com",
  projectId: "heartable-voice",
  storageBucket: "heartable-voice.firebasestorage.app",
  messagingSenderId: "25885730901",
  appId: "1:25885730901:web:3d068c81bf3dc07ecf4cdc",
  measurementId: "G-N2V0M7H3RS",
};

export const GUEST_DAILY_VOICE_LIMIT = 4;
export const GUEST_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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
