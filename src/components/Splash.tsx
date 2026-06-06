import { motion } from "motion/react";

export function Splash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      onAnimationComplete={() => {
        setTimeout(onDone, 2200);
      }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, oklch(0.83 0.11 55) 0%, oklch(0.66 0.19 38) 45%, oklch(0.28 0.07 35) 100%)",
      }}
    >
      {/* sun rays */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1.4, opacity: 0.35 }}
        transition={{ duration: 2.2, ease: "easeOut" }}
        className="absolute top-[28%] size-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.96 0.03 70 / 0.7), transparent 60%)",
        }}
      />

      {/* logo waves */}
      <div className="relative flex items-center gap-1 mb-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            initial={{ height: 6 }}
            animate={{ height: [6, 40, 6] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
            className="w-1.5 rounded-full bg-sunset-50"
          />
        ))}
      </div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
        className="font-serif italic text-6xl text-sunset-50 leading-none flex items-center justify-center gap-3"
      >
        Heartable <BetaBadge />
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="mt-3 text-[11px] tracking-[0.4em] uppercase text-sunset-50"
      >
        Voices of the Soul
      </motion.p>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 80 }}
        transition={{ delay: 1.3, duration: 0.8 }}
        className="h-px bg-sunset-50/40 mt-8"
      />
    </motion.div>
  );
}
