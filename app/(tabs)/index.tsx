// app/(tabs)/index.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { fetchPlans } from '../../src/services/planService';
import { Plan } from '../../src/types/plan';
import { Spacing, Typography } from '../../src/constants/theme';

import FirstPlanPrompt from '../../src/components/onboarding/FirstPlanPrompt';
import SquadFab from '../../src/components/onboarding/SquadFab';
import CategoryPills from '../../src/components/plan/CategoryPills';
import EmptyNearby from '../../src/components/plan/EmptyNearby';
import { useOnboardingPrompt } from '../../src/hooks/useOnboardingPrompt';
import ErrorState, { AppError } from '../../src/components/common/ErrorState';
import { announce } from '../../src/lib/a11y';

import LocationPickerModal from '../../src/components/common/LocationPickerModal';
import { updateUserCity } from '../../src/services/userService';

export default function DiscoverScreen() {
  const router = useRouter();
  // ✅ FIXED: Removed `refreshUser` as it doesn't exist in AuthContextType
  const { user } = useAuth(); 
  const { colors } = useTheme();

  const {
    visible: promptVisible,
    hasSquad,
    dismissed,
    dismiss: dismissPrompt,
  } = useOnboardingPrompt();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nearbyPlans, setNearbyPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<AppError[]>([]);
  
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [localCity, setLocalCity] = useState<string | undefined>(user?.city);
  const [updatingCity, setUpdatingCity] = useState(false);

  useEffect(() => {
    setLocalCity(user?.city);
  }, [user?.city]);

  const addError = (newError: AppError) => {
    setErrors((prev) => {
      const filtered = prev.filter((e) => e.type !== newError.type);
      return [...filtered, newError];
    });
  };

  const removeError = (id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  const loadPlans = useCallback(async () => {
    if (!localCity) {
      setLoading(false);
      setRefreshing(false);
      addError({
        id: 'location-error',
        type: 'location',
        message: 'Enable location to see plans near you.',
        actionLabel: 'Set City',
        onAction: () => setIsLocationModalOpen(true), 
      });
      return;
    }

    try {
      removeError('network-error'); 
      removeError('location-error'); 
      
      const result = await fetchPlans({
        city: localCity,
        activityFilter: selectedCategory,
        maxResults: 20,
      });
      setNearbyPlans(result.plans);
    } catch (e: any) {
      addError({
        id: 'network-error',
        type: 'network',
        message: 'No connection. Please check your internet.',
        actionLabel: 'Retry',
        onAction: loadPlans,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [localCity, selectedCategory]);

  useEffect(() => {
    setLoading(true);
    loadPlans();
  }, [loadPlans]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlans();
  }, [loadPlans]);

  const handleCityChange = async (newCity: string) => {
    if (!user) return;
    
    setLocalCity(newCity);
    setUpdatingCity(true);
    
    try {
      await updateUserCity(user.uid, newCity);
      announce(`Location changed to ${newCity}`);
      // ✅ Removed refreshUser() call here
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update city');
      setLocalCity(user.city); 
    } finally {
      setUpdatingCity(false);
    }
  };

  const goCreateSquad = () => router.push('/squad/create' as any); 
  const goCreatePlan = () => router.push('/plan/create' as any);

  const greetingName = user?.name?.split(' ')[0] ?? 'there';
  const showFab = dismissed && !hasSquad;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      
      <View style={styles.topBar}>
        <View>
          <Text 
            style={[styles.greeting, { color: colors.textSecondary }]}
            maxFontSizeMultiplier={1.5} 
          >
            Hey {greetingName} 👋
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications' as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ErrorState errors={errors} onDismiss={removeError} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
      >
        <FirstPlanPrompt
          visible={promptVisible}
          hasSquad={hasSquad}
          onCreate={hasSquad ? goCreatePlan : goCreateSquad}
          onDismiss={dismissPrompt}
        />

        <CategoryPills
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Plans nearby
          </Text>
          
          <TouchableOpacity 
            style={styles.locationBtn}
            onPress={() => setIsLocationModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Current location is ${localCity || 'unknown'}. Tap to change.`}
            disabled={updatingCity}
          >
            <Text style={[styles.sectionSub, { color: colors.primary }]}>
              {updatingCity ? 'Updating...' : localCity ?? 'Set Location'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : nearbyPlans.length === 0 ? (
          <EmptyNearby city={localCity ?? 'your city'} onCreatePlan={goCreatePlan} />
        ) : (
          nearbyPlans.map((plan) => (
            <TouchableOpacity 
              key={plan.id} 
              style={[styles.card, { backgroundColor: colors.bgSubtle }]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${plan.title || 'Untitled Plan'}, ${plan.activity}, at ${(plan as any).venue || plan.city || 'Location TBD'}`}
              onPress={() => router.push(`/plan/${plan.id}` as any)}
            >
              <Text style={[Typography.headline, { color: colors.text }]}>
                {plan.title || 'Untitled Plan'}
              </Text>
              <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
                {plan.activity} • {(plan as any).venue || plan.city || 'Location TBD'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {showFab && <SquadFab onPress={goCreateSquad} />}

      <LocationPickerModal
        visible={isLocationModalOpen}
        currentCity={localCity}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectCity={handleCityChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl * 2 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  greeting: {
    ...Typography.subhead,
    fontWeight: '600', 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title2,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Spacing.sm,
  },
  sectionSub: {
    ...Typography.caption,
    fontWeight: '700',
  },
  center: { 
    paddingVertical: Spacing.xxxl, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Spacing.sm,
  },
});