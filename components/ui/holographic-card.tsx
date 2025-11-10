"use client";

import { cn } from "@/lib/utils";
import { useRef } from "react";

interface HolographicCardProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export default function HolographicCard({
  className,
  children,
  ...props
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 12;
    const rotateY = (centerX - x) / 12;

    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
    card.style.setProperty("--bg-x", `${(x / rect.width) * 100}%`);
    card.style.setProperty("--bg-y", `${(y / rect.height) * 100}%`);
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    card.style.setProperty("--x", "50%");
    card.style.setProperty("--y", "50%");
    card.style.setProperty("--bg-x", "50%");
    card.style.setProperty("--bg-y", "50%");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative h-full w-full rounded-3xl border border-white/10 bg-white/5 p-px text-foreground shadow-[0_20px_60px_-20px_rgba(138,92,246,0.45)] transition-transform duration-200 ease-out dark:border-white/5 dark:bg-white/10",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_var(--bg-x,50%)_var(--bg-y,50%),rgba(255,255,255,0.35),transparent_55%)] opacity-0 transition-opacity duration-200 group-hover:opacity-80" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[conic-gradient(from_180deg_at_var(--bg-x,50%)_var(--bg-y,50%),rgba(129,140,248,0.6),rgba(236,72,153,0.6),rgba(45,212,191,0.6),rgba(129,140,248,0.6))] opacity-0 mix-blend-screen transition-opacity duration-200 group-hover:opacity-60" />
      <div className="relative z-10 h-full w-full rounded-[1.25rem] bg-white/10 p-6 text-foreground shadow-inner shadow-black/10 backdrop-blur-2xl dark:bg-slate-950/50">
        {children ?? (
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-xl font-semibold">Holographic Card</h3>
            <p className="text-sm text-muted-foreground">Move your mouse over me!</p>
          </div>
        )}
      </div>
    </div>
  );
}

