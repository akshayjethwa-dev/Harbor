import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { listMyTemplates } from "../services/templateService";
import { PlanTemplate } from "../types/planTemplate";

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await listMyTemplates(user.uid);
      // Sort: most-used first, then most-recent
      list.sort((a, b) => {
        if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount;
        const aT = a.updatedAt?.toMillis?.() ?? 0;
        const bT = b.updatedAt?.toMillis?.() ?? 0;
        return bT - aT;
      });
      setTemplates(list);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { templates, loading, reload: load };
}