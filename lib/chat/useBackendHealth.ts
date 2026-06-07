"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkHealth } from "@/lib/api";
import { getCachedHealth, setCachedHealth } from "@/lib/chat-store";

export function useBackendHealth() {
  const [backendOk, setBackendOk] = useState(
    () => getCachedHealth() !== false
  );
  const healthCheckedRef = useRef(false);

  useEffect(() => {
    if (healthCheckedRef.current) return;
    healthCheckedRef.current = true;
    checkHealth()
      .then(() => {
        setBackendOk(true);
        setCachedHealth(true);
      })
      .catch(() => setBackendOk(false));
  }, []);

  const markHealthy = useCallback(() => {
    setBackendOk(true);
    setCachedHealth(true);
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      await checkHealth();
      setBackendOk(true);
      setCachedHealth(true);
      return true;
    } catch {
      setBackendOk(false);
      return false;
    }
  }, []);

  return { backendOk, markHealthy, refreshHealth };
}
