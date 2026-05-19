import { useEffect, useRef, useState } from "react";
import { applyFilter, type VoiceFilter } from "@/lib/audio-filters";

export function VoicePlayer({
  url,
  filter = "None",
  durationSec,
  onPlayComplete,
  compact,
}: {
  url: string;
  filter?: VoiceFilter;
  durationSec?: number;
  onPlayComplete?: () => void;
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<{ cleanup: () => void } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      ctxRef.current?.cleanup();
    };
  }, []);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      return;
    }
    if (!ctxRef.current) {
      ctxRef.current = applyFilter(audioRef.current, filter);
    }
    try {
      await audioRef.current.play();
    } catch (e) {
      console.error(e);
    }
  };

  const bars = 24;
  const seed = url.length;
  const heights = Array.from(
    { length: bars },
    (_, i) => 0.3 + ((Math.sin(i * 1.3 + seed) + 1) / 2) * 0.7,
  );

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "py-2"}`}>
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="size-11 rounded-full bg-sunset-100 hover:bg-sunset-200 flex items-center justify-center ring-1 ring-foreground/5 transition shrink-0"
      >
        {playing ? (
          <div className="flex gap-0.5">
            <div className="w-1 h-3.5 bg-sunset-900 rounded-sm" />
            <div className="w-1 h-3.5 bg-sunset-900 rounded-sm" />
          </div>
        ) : (
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-sunset-900 border-b-[6px] border-b-transparent ml-1" />
        )}
      </button>
      <div className="flex-1 h-10 flex items-center gap-1">
        {heights.map((h, i) => {
          const active = i / bars <= progress;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full ${
                active ? "bg-sunset-600" : "bg-sunset-200"
              }`}
              style={{ height: `${h * 32}px` }}
            />
          );
        })}
      </div>
      {durationSec ? (
        <span className="text-[10px] opacity-50 tabular-nums w-8 text-right">
          {Math.floor(durationSec)}s
        </span>
      ) : null}
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        crossOrigin="anonymous"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          onPlayComplete?.();
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress(a.currentTime / a.duration);
        }}
      />
    </div>
  );
}
