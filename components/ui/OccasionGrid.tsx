"use client";

import { OCCASION_TILES } from "@/lib/occasions";

interface OccasionGridProps {
  onSelect: (message: string) => void;
}

export default function OccasionGrid({ onSelect }: OccasionGridProps) {
  return (
    <div className="w-full py-10 px-2 animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#f0f0f0] tracking-tight">
          Hi! I&apos;m your Kapruka assistant
        </h2>
        <div className="w-12 h-0.5 bg-gradient-to-r from-[#e65100] to-[#ff8f4e] mx-auto mt-2 rounded-full" />
        <p className="font-sinhala text-sm text-[#e65100]/90 mt-2">
          ආයුබෝවන්! මම Kapruka සහායක
        </p>
        <p className="text-sm text-[#8a8a8a] mt-3">
          What can I help you find today?
        </p>
      </div>

      <p className="text-xs font-medium text-[#8a8a8a] mb-3 px-1 uppercase tracking-wide">
        Quick starts
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {OCCASION_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => onSelect(tile.message)}
            className="flex flex-col items-start gap-1 px-4 py-3.5 rounded-xl bg-[#242424] border border-[#2e2e2e] hover:border-[#e65100]/60 hover:bg-[#2a2a2a] transition-all duration-200 text-left hover:shadow-md hover:shadow-[#e65100]/5 active:scale-[0.98]"
          >
            <span className="text-2xl leading-none" aria-hidden>
              {tile.emoji}
            </span>
            <span className="text-sm font-medium text-[#f0f0f0]">
              {tile.label}
            </span>
            <span className="font-sinhala text-xs text-[#8a8a8a]">
              {tile.labelSinhala}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
