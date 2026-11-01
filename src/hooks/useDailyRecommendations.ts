// src/hooks/useDailyRecommendations.ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Recommendation, fetchDailyRecommendations, getDismissedIds, dismissPick } from "../services/recommendationService";

export function useDailyRecommendations() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Recommendation[]>([]);
  const [partners, setPartners] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const dismissed = await getDismissedIds();
      const result = await fetchDailyRecommendations(user, dismissed);
      setPlans(result.plans);
      setPartners(result.partners);
    } catch (e) {
      console.warn("Failed to load recommendations:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = useCallback(
    async (pickId: string) => {
      await dismissPick(pickId);
      // Refetch to replace with next best
      await load();
    },
    [load]
  );

  return { plans, partners, loading, dismiss, refresh: load };
}