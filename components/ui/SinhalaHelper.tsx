"use client";

import { useState } from "react";
import { GIFT_MESSAGE_TEMPLATES } from "@/lib/sinhala";

interface SinhalaHelperProps {
  onSave: (english: string, sinhala: string) => void;
  onClose: () => void;
}

export default function SinhalaHelper({ onSave, onClose }: SinhalaHelperProps) {
  const [tab, setTab] = useState<"english" | "sinhala">("english");
  const [english, setEnglish] = useState("");
  const [sinhala, setSinhala] = useState("");

  const applyTemplate = (key: string) => {
    const msg = GIFT_MESSAGE_TEMPLATES[key];
    if (msg) {
      setSinhala(msg);
      setTab("sinhala");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] p-5">
        <h3 className="font-bold text-lg text-[#f0f0f0] mb-3">Gift message</h3>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTab("english")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              tab === "english"
                ? "bg-[#e65100] text-white"
                : "bg-[#242424] text-[#8a8a8a]"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setTab("sinhala")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium font-sinhala ${
              tab === "sinhala"
                ? "bg-[#e65100] text-white"
                : "bg-[#242424] text-[#8a8a8a]"
            }`}
          >
            සිංහල
          </button>
        </div>
        {tab === "sinhala" && (
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(GIFT_MESSAGE_TEMPLATES).map(([key, text]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="text-xs px-2 py-1 rounded-full bg-[#2a1f00] border border-[#e65100]/40 font-sinhala text-[#ff8f4e] hover:border-[#e65100]"
              >
                {text.slice(0, 20)}…
              </button>
            ))}
          </div>
        )}
        <textarea
          className={`w-full border border-[#2e2e2e] bg-[#242424] text-[#f0f0f0] rounded-xl p-3 text-sm min-h-[100px] placeholder:text-[#8a8a8a] ${
            tab === "sinhala" ? "font-sinhala" : ""
          }`}
          placeholder={
            tab === "sinhala"
              ? "සුභ පැතුම් ලියන්න..."
              : "Write your gift message..."
          }
          value={tab === "sinhala" ? sinhala : english}
          onChange={(e) =>
            tab === "sinhala"
              ? setSinhala(e.target.value)
              : setEnglish(e.target.value)
          }
        />
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-[#2e2e2e] text-[#8a8a8a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(english, sinhala)}
            className="flex-1 py-2 rounded-xl bg-[#22c55e] text-white font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
