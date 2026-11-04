// app/onboarding/intent.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../src/lib/firebase';
import { useTheme } from '../../src/theme/ThemeContext';
import {
  incrementIntentAbandonCount,
  resetIntentAbandonCount,
} from '../../src/lib/onboarding';

type Intent = 'host' | 'join' | 'meet';

const INTENT_OPTIONS: { id: Intent; title: string; description: string; icon: string }[] = [
  {
    id: 'host',
    title: 'Host a plan',
    description: 'Create and organize an activity for others to join.',
    icon: '🎉',
  },
  {
    id: 'join',
    title: 'Join plans near me',
    description: 'Discover and join activities happening around you.',
    icon: '📍',
  },
  {
    id: 'meet',
    title: 'Meet people one-on-one',
    description: 'Connect with individuals for 1:1 activities or chats.',
    icon: '🤝',
  },
];

export default function IntentSelectionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [abandonCount, setAbandonCount] = useState(0);

  // Track abandonment on mount
  useEffect(() => {
    const trackAbandonment = async () => {
      const count = await incrementIntentAbandonCount();
      setAbandonCount(count);
    };
    trackAbandonment();
  }, []);

  const handleSelectIntent = (intent: Intent) => {
    if (isConfirming) return; // Prevent selection changes during confirmation
    setSelectedIntent(intent);
  };

  const handleConfirm = async () => {
    if (!selectedIntent || isConfirming) return;
    setIsConfirming(true);
    
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      setIsConfirming(false);
      return;
    }

    try {
      // 1. Persist the user's primary intent to Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { primary_intent: selectedIntent });

      // 2. Reset the abandonment counter on success
      await resetIntentAbandonCount();

      // 3. Route to the correct destination based on the choice
      switch (selectedIntent) {
        case 'host':
          router.replace('/plan/create' as any);
          break;
        case 'join':
          router.replace('/(tabs)' as any);
          break;
        case 'meet':
          router.replace('/(tabs)/partners?partnerMode=true' as any);
          break;
      }
    } catch (error) {
      console.error('Failed to save intent:', error);
      Alert.alert('Error', 'Could not save your choice. Please try again.');
      setIsConfirming(false);
    }
  };

  const handleSkip = () => {
    // Route to Discover without saving intent.
    // The Discover screen will show a banner prompting them to set it later.
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          What brings you to Harbor?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose your primary goal so we can tailor your experience from the start.
        </Text>

        <View style={styles.cardsContainer}>
          {INTENT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.card,
                { borderColor: colors.borderStrong },
                selectedIntent === option.id && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => handleSelectIntent(option.id)}
              disabled={isConfirming}
              activeOpacity={0.8}
            >
              <Text style={styles.cardIcon}>{option.icon}</Text>
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {option.title}
                </Text>
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            {
              backgroundColor: selectedIntent ? colors.primary : colors.borderStrong,
              opacity: isConfirming ? 0.7 : 1,
            },
          ]}
          onPress={handleConfirm}
          disabled={!selectedIntent || isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={[styles.confirmButtonText, { color: colors.textInverse }]}>
              Continue
            </Text>
          )}
        </TouchableOpacity>

        {/* Show Skip link if abandoned twice or more */}
        {abandonCount >= 2 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  cardsContainer: { gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cardIcon: { fontSize: 32, marginRight: 16 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  footer: { padding: 24 },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: { fontSize: 18, fontWeight: '700' },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: { fontSize: 14, fontWeight: '600' },
});