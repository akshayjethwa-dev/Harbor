// src/hooks/useOnboardingPrompt.ts
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { shouldShowBanner, dismissBanner } from '../lib/onboarding';

export function useOnboardingPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [hasSquad, setHasSquad] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) return;

      // 1️⃣  User already has plans → never show onboarding prompt.
      const hasPlans =
        (user.plansCreatedCount ?? 0) > 0 ||
        (user.plansHosted ?? 0) > 0 ||
        (user.plansJoined ?? 0) > 0;

      if (hasPlans) {
        if (!cancelled) {
          setVisible(false);
          setDismissed(false);
          setLoading(false);
        }
        return;
      }

      // 2️⃣  7-day dismissal window (AsyncStorage).
      const shouldShow = await shouldShowBanner();
      if (!shouldShow) {
        if (!cancelled) {
          setVisible(false);
          setDismissed(true);
          setLoading(false);
        }
        return;
      }

      // 3️⃣  Real Firestore query — does the user already belong to a squad?
      const squadsQ = query(
        collection(db, 'squads'),
        where('memberUids', 'array-contains', user.uid),
      );
      const squadsSnap = await getDocs(squadsQ);

      if (!cancelled) {
        setHasSquad(!squadsSnap.empty);
        setVisible(true);
        setDismissed(false);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    setDismissed(true);
    await dismissBanner();
  }, []);

  return { visible, hasSquad, dismissed, loading, dismiss };
}