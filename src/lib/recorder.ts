import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "stopped";

export function useRecorder(maxSec = 60) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0.1));

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef(0);

  const cleanup = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (state === "recording") return;
    setBlob(null);
    chunksRef.current = [];
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Mic API not available. iOS users: Safari me kholo, in-app browser me nahi.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    // iOS Safari needs audio/mp4; everything else prefers webm/opus
    const candidates = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "",
    ];
    const MR: any = (window as any).MediaRecorder;
    let mime = "";
    for (const c of candidates) {
      if (!c || (MR && typeof MR.isTypeSupported === "function" && MR.isTypeSupported(c))) {
        mime = c; break;
      }
    }
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const finalType = mr.mimeType || mime || "audio/webm";
    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = () => {
      const b = new Blob(chunksRef.current, { type: finalType });
      setBlob(b);
      cleanup();
      setState("stopped");
    };
    mediaRef.current = mr;
    mr.start();

    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    startTsRef.current = Date.now();
    setElapsed(0);

    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const out: number[] = [];
      const step = Math.floor(data.length / 12);
      for (let i = 0; i < 12; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j];
        out.push(Math.max(0.08, sum / step / 255));
      }
      setLevels(out);
      const el = (Date.now() - startTsRef.current) / 1000;
      setElapsed(el);
      if (el >= maxSec) {
        stop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    setState("recording");
  }, [state, cleanup, maxSec]);

  const stop = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setBlob(null);
    setElapsed(0);
    setLevels(Array(12).fill(0.1));
    setState("idle");
  }, [cleanup]);

  return { state, elapsed, blob, levels, start, stop, reset };
}
