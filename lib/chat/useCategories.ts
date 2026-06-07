"use client";

import { useEffect, useState } from "react";
import { getCategories } from "@/lib/api";
import type { KaprukaCategory } from "@/lib/types";

export function useCategories() {
  const [categories, setCategories] = useState<KaprukaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats);
        setError(null);
      })
      .catch(() => {
        setCategories([]);
        setError("Could not load categories");
      })
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading, error };
}
