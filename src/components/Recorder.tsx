import { useState } from "react";
import { FILTERS, type VoiceFilter } from "@/lib/audio-filters";
import { useRecorder } from "@/lib/recorder";

export function Recorder({
  onSubmit,
  submitLabel = "Share",
  busy,
}: {
  onSubmit: (blob: Blob, filter: VoiceFilter, durationSec: number) => Promise<void> | void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const { state, elapsed, blob, levels, start, stop, reset } = useRecorder(60);
  const [filter, setFilter] = useState<VoiceFilter>("Romantic Reverb");

  const handlePointer = async (down: boolean) => {
    if (down) {
      try {
        await start();
      } catch (e) {
        console.error("mic permission", e);
        alert("Microphone permission chahiye recording ke liye.");
      }
    } else {
      stop();
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur rounded-[28px] p-7 ring-1 ring-foreground/5 flex flex-col items-center text-center gap-6 shadow-[0_30px_60px_-30px_oklch(0.66_0.19_38/0.25)]">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-serif text-balance leading-[1.1]">
          {state === "recording"
            ? `Sun raha hoon… ${elapsed.toFixed(1)}s`
            : state === "stopped"
              ? "Ek baar sun le?"
              : "Tap & hold, kuch keh"}
        </h2>
        <p className="text-xs text-sunset-900/60">
          {state === "recording" ? "Release to stop" : "Max 60 seconds"}
        </p>
      </div>

      {/* Record button */}
      <div className="relative flex items-center justify-center my-1 select-none">
        {state === "recording" && (
          <div className="absolute size-36 rounded-full bg-sunset-600/20 animate-pulse" />
        )}
        <div className="absolute size-28 rounded-full bg-sunset-600/15" />
        <button
          aria-label="Record voice"
          disabled={busy}
          onPointerDown={() => handlePointer(true)}
          onPointerUp={() => handlePointer(false)}
          onPointerLeave={() => state === "recording" && handlePointer(false)}
          className="relative size-24 rounded-full bg-sunset-600 shadow-xl flex items-center justify-center text-white ring-4 ring-white transition-transform active:scale-95"
        >
          <div
            className={`bg-white transition-all ${
              state === "recording" ? "size-7 rounded-full" : "size-5 rounded-[6px]"
            }`}
          />
        </button>
      </div>

      {/* Live waveform */}
      <div className="flex items-center justify-center gap-1.5 h-10 w-full">
        {levels.map((l, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-sunset-600 transition-[height]"
            style={{ height: `${Math.max(4, l * 40)}px` }}
          />
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap justify-center">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full ring-1 transition ${
              filter === f
                ? "bg-sunset-900 text-sunset-50 ring-sunset-900"
                : "bg-sunset-100 text-sunset-900 ring-foreground/5 hover:bg-sunset-200/70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {state === "stopped" && blob && (
        <div className="flex gap-2 w-full">
          <button
            onClick={reset}
            disabled={busy}
            className="flex-1 px-4 py-3 rounded-full bg-sunset-100 text-sunset-900 text-sm font-medium hover:bg-sunset-200 transition"
          >
            Re-record
          </button>
          <button
            onClick={async () => {
              await onSubmit(blob, filter, elapsed);
              reset();
            }}
            disabled={busy}
            className="flex-1 px-4 py-3 rounded-full bg-sunset-600 text-white text-sm font-semibold hover:bg-sunset-700 transition disabled:opacity-50"
          >
            {busy ? "Sharing…" : submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}
