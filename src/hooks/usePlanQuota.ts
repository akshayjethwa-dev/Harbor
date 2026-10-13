import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getPlanCreationQuota, PlanQuota } from "../services/rateLimitService";

export function usePlanQuota() {
  const [quota, setQuota] = useState<PlanQuota | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = await getPlanCreationQuota();
      setQuota(q);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { quota, loading, reload: load };
}