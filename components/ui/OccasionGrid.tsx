"use client";

import { OCCASION_TILES } from "@/lib/occasions";

interface OccasionGridProps {
  onSelect: (message: string) => void;
}

export default function OccasionGrid({ onSelect }: OccasionGridProps) {
  return (
    <div className="w-full py-8 px-2 animate-fade-in-up">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-[#f0f0f0]">
          Hi! I&apos;m your Kapruka assistant
        </h2>
        <p className="font-sinhala text-base text-[#e65100] mt-1">
          ආයුබෝවන්! මම Kapruka සහායක
        </p>
        <p className="text-sm text-[#8a8a8a] mt-3">
          What can I help you find today?
        </p>
        <p className="font-sinhala text-sm text-[#8a8a8a]">
          අද මොනවා හොයාගන්නද?
        </p>
      </div>

      <p className="text-xs text-[#8a8a8a] mb-2 px-1">Try asking:</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {OCCASION_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => onSelect(tile.message)}
            className="shrink-0 flex flex-col items-start px-4 py-3 rounded-xl bg-[#242424] border border-[#2e2e2e] hover:border-[#e65100] hover:bg-[#2a2a2a] transition-all duration-200 text-left min-w-[120px] hover:scale-[1.02]"
          >
            <span className="text-sm font-medium text-[#f0f0f0]">
              {tile.label}
            </span>
            <span className="font-sinhala text-xs text-[#8a8a8a] mt-0.5">
              {tile.labelSinhala}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
