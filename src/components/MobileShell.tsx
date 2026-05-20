import type { ReactNode } from "react";

/**
 * Fluid mobile-first container. Pure phone widths on small screens,
 * centered column on tablet+. Includes safe-area padding for bottom nav.
 */
export function MobileShell({
  children,
  className = "",
  bgClass = "bg-sunset-50",
}: {
  children: ReactNode;
  className?: string;
  bgClass?: string;
}) {
  return (
    <div className={`min-h-[100dvh] ${bgClass} text-sunset-900`}>
      <div
        className={`w-full sm:max-w-[480px] mx-auto min-h-[100dvh] flex flex-col sm:border-x sm:border-foreground/5 pb-[calc(96px+env(safe-area-inset-bottom))] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}