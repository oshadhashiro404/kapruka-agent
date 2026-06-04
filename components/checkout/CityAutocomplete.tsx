"use client";

import { useEffect, useRef, useState } from "react";
import { searchCities } from "@/lib/api";
import type { KaprukaCity } from "@/lib/types";

interface CityAutocompleteProps {
  value: string;
  cityCode: string;
  onChange: (city: string, cityCode: string) => void;
  disabled?: boolean;
}

export default function CityAutocomplete({
  value,
  cityCode,
  onChange,
  disabled,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<KaprukaCity[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const cities = await searchCities(trimmed, 15);
        setSuggestions(cities);
        setListOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pick = (city: KaprukaCity) => {
    setQuery(city.name);
    onChange(city.name, city.city_code || city.name);
    setListOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <label className="block text-xs text-muted mb-1">
        Delivery city / <span className="font-sinhala">නගරය</span>
      </label>
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value, cityCode);
          if (e.target.value.trim().length < 2) {
            setSuggestions([]);
            setListOpen(false);
          }
        }}
        onFocus={() => suggestions.length > 0 && setListOpen(true)}
        placeholder="e.g. Colombo, Kandy"
        className="w-full rounded-xl border border-border bg-elevated text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
      />
      {loading && (
        <p className="text-xs text-muted mt-1">Searching cities…</p>
      )}
      {listOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-elevated shadow-lg">
          {suggestions.map((c) => (
            <li key={`${c.city_code}-${c.name}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface hover:text-primary transition-colors"
                onClick={() => pick(c)}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
