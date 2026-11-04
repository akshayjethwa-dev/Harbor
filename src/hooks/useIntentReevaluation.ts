// src/hooks/useIntentReevaluation.ts
import { useEffect, useState } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

const INTENT_REEVALUATION_KEY = '@Kithra/intent_reevaluation_prompted';

export function useIntentReevaluation() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkIntent = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Only reevaluate if the user's intent is "join" or "meet"
      if (user.primary_intent !== 'join' && user.primary_intent !== 'meet') {
        setLoading(false);
        return;
      }

      // Check if we've already prompted this user
      const hasBeenPrompted = await AsyncStorage.getItem(INTENT_REEVALUATION_KEY);
      if (hasBeenPrompted) {
        setLoading(false);
        return;
      }

      // Count plans created by this user in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const plansRef = collection(db, 'plans');
      const q = query(
        plansRef,
        where('hostUid', '==', user.uid),
        where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );

      try {
        const snap = await getDocs(q);
        if (snap.size >= 2) {
          setShowPrompt(true);
        }
      } catch (e) {
        console.warn('Failed to check plan creation count:', e);
      } finally {
        setLoading(false);
      }
    };

    checkIntent();
  }, [user]);

  const acceptSwitch = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        primary_intent: 'host',
      });
      await AsyncStorage.setItem(INTENT_REEVALUATION_KEY, 'true');
      setShowPrompt(false);
    } catch (e) {
      console.error('Failed to update intent:', e);
    }
  };

  const dismissPrompt = async () => {
    await AsyncStorage.setItem(INTENT_REEVALUATION_KEY, 'true');
    setShowPrompt(false);
  };

  return { showPrompt, loading, acceptSwitch, dismissPrompt };
}