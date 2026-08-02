"use client";

import type { CSSProperties } from "react";
import type { MedTokCard as MedTokCardData } from "@/app/api/medtok/cards/route";

interface MedTokCardProps {
  card: MedTokCardData;
  style?: CSSProperties;
  vraiOpacity: number;
  fauxOpacity: number;
  skipOpacity: number;
  interactive: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export default function MedTokCard({
  card,
  style,
  vraiOpacity,
  fauxOpacity,
  skipOpacity,
  interactive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: MedTokCardProps) {
  return (
    <div
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
      style={style}
      className={`absolute inset-0 flex select-none flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-[#1a1917] ${
        interactive ? "cursor-grab touch-none active:cursor-grabbing" : ""
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start p-6"
        style={{ opacity: vraiOpacity }}
      >
        <span className="-rotate-12 rounded-xl border-4 border-emerald-500 px-4 py-1.5 text-2xl font-black tracking-wide text-emerald-500">
          VRAI
        </span>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-6"
        style={{ opacity: fauxOpacity }}
      >
        <span className="rotate-12 rounded-xl border-4 border-red-500 px-4 py-1.5 text-2xl font-black tracking-wide text-red-500">
          FAUX
        </span>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-8"
        style={{ opacity: skipOpacity }}
      >
        <span className="rounded-xl border-4 border-stone-400 px-4 py-1.5 text-xl font-black tracking-wide text-stone-400">
          PASSER
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-5 py-3 dark:border-stone-900">
        <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-black uppercase tracking-wide text-stone-600 dark:bg-[#151512] dark:text-stone-300">
          {card.matiere}
        </span>
      </div>

      {/* touch-pan-y : permet de faire défiler un contexte/question longs verticalement au
          doigt, tout en laissant le geste horizontal (swipe vrai/faux) remonter à la carte. */}
      <div className="touch-pan-y flex-1 overflow-y-auto px-5 py-4">
        {card.contexte && (
          <div className="mb-4 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-600 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-300">
            {card.contexte}
          </div>
        )}

        <p className="mb-5 whitespace-pre-wrap text-sm font-bold leading-6 text-stone-500 dark:text-stone-400">
          {card.question}
        </p>

        <div className="flex min-h-[6rem] items-center justify-center rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-5 text-center dark:border-emerald-500 dark:bg-emerald-950/30">
          <p className="whitespace-pre-wrap text-lg font-black leading-6 text-stone-950 dark:text-stone-100">
            {card.proposition}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 text-xs font-bold text-stone-400 dark:text-stone-500">
        <span>← Vrai</span>
        <span>↓ Passer</span>
        <span>Faux →</span>
      </div>
    </div>
  );
}
