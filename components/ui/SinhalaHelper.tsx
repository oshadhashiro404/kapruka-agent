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
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-5">
        <h3 className="font-bold text-lg text-foreground mb-3">Gift message</h3>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTab("english")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              tab === "english"
                ? "bg-primary text-white"
                : "bg-elevated text-muted"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setTab("sinhala")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium font-sinhala ${
              tab === "sinhala"
                ? "bg-primary text-white"
                : "bg-elevated text-muted"
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
                className="text-xs px-2 py-1 rounded-full bg-primary/10 border border-primary/40 font-sinhala text-accent hover:border-primary"
              >
                {text.slice(0, 20)}…
              </button>
            ))}
          </div>
        )}
        <textarea
          className={`w-full border border-border bg-elevated text-foreground rounded-xl p-3 text-sm min-h-[100px] placeholder:text-muted ${
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
            className="flex-1 py-2 rounded-xl border border-border text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(english, sinhala)}
            className="flex-1 py-2 rounded-xl bg-success text-white font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
