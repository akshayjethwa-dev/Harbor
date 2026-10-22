// app/(tabs)/crews.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { QueryDocumentSnapshot } from 'firebase/firestore';

import { useAuth } from '../../src/context/AuthContext';
import { fetchPlans } from '../../src/services/planService';
import { Plan } from '../../src/types/plan';
import PlanCard from '../../src/components/plan/PlanCard';
import CategoryPills from '../../src/components/plan/CategoryPills';
import EmptyNearby from '../../src/components/plan/EmptyNearby';
import FirstPlanPrompt from '../../src/components/onboarding/FirstPlanPrompt';
import { usePlanQuota } from '../../src/hooks/usePlanQuota';
import { useOnboardingPrompt } from '../../src/hooks/useOnboardingPrompt';
import { useTheme } from '../../src/theme/ThemeContext';
import { useThemedStyles } from '../../src/hooks/useThemedStyles';
import { ThemeColors } from '../../src/theme/colors';
import { Spacing, Typography } from '../../src/constants/theme';
import { announce } from '../../src/lib/a11y';

import LocationPickerModal from '../../src/components/common/LocationPickerModal';
import { updateUserCity } from '../../src/services/userService';

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      gap: Spacing.md,
    },
    greeting: {
      ...Typography.subhead,
      fontWeight: '600',
      color: c.textSecondary,
    },
    subtitle: {
      ...Typography.title2,
      color: c.text,
      marginTop: Spacing.xxs,
    },
    searchBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.bgSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    locationBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: Spacing.xxs,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: Spacing.sm,
      marginLeft: -Spacing.sm,
    },
    quotaBanner: {
      backgroundColor: c.bg === '#0F0F0F' ? '#3A2A0F' : '#FFF8E1',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.warning + '33',
    },
    quotaText: {
      ...Typography.caption,
      color: c.warning,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxxl,
    },
    emptyContainer: {
      flex: 1,
      paddingTop: Spacing.xl,
    },
    errorBox: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      alignItems: 'center',
    },
    errorText: {
      ...Typography.body,
      color: c.danger,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    retryBtn: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.sm,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    retryText: {
      ...Typography.body,
      color: c.primary,
      fontWeight: '700',
    },
  });

export default function CrewsScreen() {
  // ✅ FIXED: Removed `refreshUser` as it doesn't exist in AuthContextType
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [localCity, setLocalCity] = useState<string | undefined>(user?.city);
  const [updatingCity, setUpdatingCity] = useState(false);

  const { quota } = usePlanQuota();
  const quotaExhausted = quota && !quota.allowed;

  const {
    visible: promptVisible,
    hasSquad,
    dismiss: dismissPrompt,
  } = useOnboardingPrompt();

  useEffect(() => {
    setLocalCity(user?.city);
  }, [user?.city]);

  const loadFirst = useCallback(async () => {
    if (!localCity) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPlans({
        city: localCity,
        activityFilter,
        maxResults: 20,
      });
      setPlans(result.plans);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e: any) {
      console.warn(e);
      setError(e.message ?? 'Could not load Plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [localCity, activityFilter]);

  useEffect(() => {
    if (user) loadFirst();
  }, [user, activityFilter, loadFirst]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadFirst();
    }, [user, loadFirst]),
  );

  const loadMore = async () => {
    if (!hasMore || loadingMore || !cursor || !localCity) return;
    setLoadingMore(true);
    try {
      const result = await fetchPlans({
        city: localCity,
        activityFilter,
        maxResults: 20,
        cursor,
      });
      setPlans((prev) => [...prev, ...result.plans]);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFirst();
  };

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

  const handleCreatePlan = () => {
    if (quotaExhausted && quota) {
      const msg =
        quota.dailyRemaining === 0
          ? `You've reached your daily limit (${quota.dailyLimit} Plans/day). Try again tomorrow.`
          : `You've reached your weekly limit (${quota.weeklyLimit} Plans/week).`;
      if (Platform.OS === 'web') {
        // @ts-ignore
        window.alert(msg);
      } else {
        Alert.alert('Rate limit', msg);
      }
      return;
    }
    router.push('/plan/create' as any);
  };

  const handleCreateSquad = () => {
    router.push('/squad/create' as any);
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hey {firstName} 👋</Text>
          
          <TouchableOpacity 
            style={styles.locationBtn}
            onPress={() => setIsLocationModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Current location is ${localCity || 'unknown'}. Tap to change.`}
            disabled={updatingCity}
          >
            <Text style={[styles.subtitle, { color: colors.primary }]} numberOfLines={1}>
              {updatingCity 
                ? 'Updating location...' 
                : localCity 
                  ? `Plans near ${localCity}` 
                  : 'Set your location'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.primary} style={{ marginTop: 2 }} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/search' as any)}
          style={styles.searchBtn}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Ionicons name="search" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {quota && quota.allowed && quota.dailyRemaining <= 1 && (
        <View style={styles.quotaBanner}>
          <Text style={styles.quotaText}>
            ⚡ You have {quota.dailyRemaining} Plan
            {quota.dailyRemaining === 1 ? '' : 's'} left today
          </Text>
        </View>
      )}

      <FirstPlanPrompt
        visible={promptVisible}
        hasSquad={hasSquad}
        onCreate={hasSquad ? handleCreatePlan : handleCreateSquad}
        onDismiss={dismissPrompt}
      />

      <CategoryPills selected={activityFilter} onSelect={setActivityFilter} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ Couldn't load Plans\n{error}</Text>
          <TouchableOpacity 
            onPress={loadFirst} 
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry loading plans"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              onPress={() => router.push(`/plan/${item.id}` as any)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <EmptyNearby
                city={localCity || 'your city'}
                onCreatePlan={handleCreatePlan}
              />
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginVertical: Spacing.lg }}
              />
            ) : null
          }
        />
      )}

      <LocationPickerModal
        visible={isLocationModalOpen}
        currentCity={localCity}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectCity={handleCityChange}
      />
    </SafeAreaView>
  );
}