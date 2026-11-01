// app/plan/quick.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePlanCreateStore } from '../../src/store/planCreateStore';
import { useAuth } from '../../src/context/AuthContext';
import { createPlan } from '../../src/services/planService';
import { ACTIVITIES } from '../../src/constants/activities';
import { useTheme } from '../../src/theme/ThemeContext';
import { ThemeColors } from '../../src/theme/colors';

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 24, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 8, marginTop: 20 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    chipSelected: { borderColor: c.primary, backgroundColor: c.primarySubtle },
    chipText: { fontSize: 14, fontWeight: '600', color: c.text },
    chipTextSelected: { color: c.primary },
    input: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 12,
      height: 52,
      paddingHorizontal: 16,
      fontSize: 16,
      backgroundColor: c.bgElevated,
      color: c.text,
    },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    locationRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    locationBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: c.primarySubtle,
    },
    locationBtnText: { color: c.primary, fontWeight: '700' },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
      backgroundColor: c.bgElevated,
    },
    stepBtn: { padding: 8 },
    stepBtnText: { fontSize: 24, fontWeight: '700', color: c.primary },
    stepValue: { fontSize: 18, fontWeight: '700', color: c.text },
    footer: { flexDirection: 'row', gap: 12, marginTop: 32 },
    publishBtn: {
      flex: 2,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
    },
    publishBtnText: { color: c.textInverse, fontSize: 16, fontWeight: '700' },
    switchBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.borderStrong,
      alignItems: 'center',
    },
    switchBtnText: { color: c.text, fontSize: 14, fontWeight: '700' },
  });

export default function QuickPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { draft, updateDraft, reset } = usePlanCreateStore();

  // Local UI state for date/time strings (stored in draft as Date + "HH:MM")
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre‑fill city from user profile when the screen opens
  useEffect(() => {
    if (user?.city && !draft.city) {
      updateDraft({ city: user.city });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.city]);

  // Sync local date/time strings with draft (in case user switched from Advanced)
  useEffect(() => {
    if (draft.startDate) {
      setDateStr(draft.startDate.toISOString().split('T')[0]);
    }
    if (draft.startTime) {
      setTimeStr(draft.startTime);
    }
  }, [draft.startDate, draft.startTime]);

  const handleDateChange = (text: string) => {
    setDateStr(text);
    const parsed = new Date(text + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      updateDraft({ startDate: parsed });
    }
  };

  const handleTimeChange = (text: string) => {
    setTimeStr(text);
    if (/^\d{2}:\d{2}$/.test(text)) {
      updateDraft({ startTime: text });
    }
  };

  const handleCapacityStep = (delta: number) => {
    const next = Math.max(2, (draft.capacity || 2) + delta);
    updateDraft({ capacity: next });
  };

  const handleUseCurrentLocation = () => {
    if (user?.city) {
      updateDraft({ city: user.city });
    } else {
      Alert.alert('No location', 'We could not detect your city. Please enter it manually.');
    }
  };

  const validate = useCallback((): boolean => {
    if (!draft.activity) {
      Alert.alert('Pick an activity', 'Choose what you’ll be doing.');
      return false;
    }
    if (draft.activity === 'custom' && !draft.activityCustom.trim()) {
      Alert.alert('Describe the activity', 'Please enter a custom activity.');
      return false;
    }
    if (!draft.startDate) {
      Alert.alert('Pick a date', 'Enter a valid date (YYYY-MM-DD).');
      return false;
    }
    if (!/^\d{2}:\d{2}$/.test(draft.startTime)) {
      Alert.alert('Pick a time', 'Enter a valid time (HH:MM).');
      return false;
    }
    // ensure start is in the future
    const [hh, mm] = draft.startTime.split(':').map(Number);
    const start = new Date(draft.startDate);
    start.setHours(hh, mm, 0, 0);
    if (start.getTime() <= Date.now()) {
      Alert.alert('Future date required', 'Plan start time must be in the future.');
      return false;
    }
    if (!draft.city?.trim()) {
      Alert.alert('Add a city', 'Enter the city or area for your Plan.');
      return false;
    }
    if (!draft.locationName?.trim()) {
      Alert.alert('Add a venue', 'Enter the meeting point or venue name.');
      return false;
    }
    return true;
  }, [draft]);

  const handlePublish = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in.');
      return;
    }
    if (!validate()) return;

    setSaving(true);
    try {
      // Apply the silent defaults required for Quick Plan
      updateDraft({
        approvalMode: 'auto',
        visibility: 'public',
        requirements: {
          verifiedOnly: false,
          womenOnly: false,
          minGuestScore: null,
          skillLevel: null,
        },
        costTotal: 0, // free by default
        durationMinutes: 120, // sensible default; user can change in Advanced
      });

      // The store update is synchronous, but createPlan reads the latest draft.
      const planId = await createPlan(user, usePlanCreateStore.getState().draft);
      reset();
      router.replace(`/plan/${planId}` as any);
    } catch (e: any) {
      console.warn(e);
      Alert.alert('Could not create Plan', e.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToAdvanced = () => {
    // The draft already holds the Quick‑Plan values.
    // Navigate to the full wizard; it will restore the persisted draft.
    router.replace('/plan/create' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Quick Plan</Text>
        <Text style={styles.subtitle}>
          Fill four fields and publish instantly. You can add more details later.
        </Text>

        {/* Activity */}
        <Text style={styles.label}>Activity</Text>
        <View style={styles.chipRow}>
          {ACTIVITIES.map((act) => {
            const selected = draft.activity === act.value;
            return (
              <TouchableOpacity
                key={act.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => updateDraft({ activity: act.value })}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {act.emoji} {act.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {draft.activity === 'custom' && (
          <>
            <Text style={styles.label}>Describe your activity</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Board game night"
              placeholderTextColor={colors.textMuted}
              value={draft.activityCustom}
              onChangeText={(t) => updateDraft({ activityCustom: t })}
              maxLength={30}
            />
          </>
        )}

        {/* Date & Time */}
        <Text style={styles.label}>Date & Time</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={dateStr}
            onChangeText={handleDateChange}
            keyboardType="numbers-and-punctuation"
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="HH:MM"
            placeholderTextColor={colors.textMuted}
            value={timeStr}
            onChangeText={handleTimeChange}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* City / Area */}
        <Text style={styles.label}>City / Area</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="e.g. Bandra West"
            placeholderTextColor={colors.textMuted}
            value={draft.city}
            onChangeText={(t) => updateDraft({ city: t })}
          />
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={handleUseCurrentLocation}
          >
            <Text style={styles.locationBtnText}>📍 Use current</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Venue / Meeting point</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Carter Road Promenade"
          placeholderTextColor={colors.textMuted}
          value={draft.locationName}
          onChangeText={(t) => updateDraft({ locationName: t })}
        />

        {/* Max Attendees */}
        <Text style={styles.label}>Max attendees</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handleCapacityStep(-1)}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepValue}>{draft.capacity}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handleCapacityStep(1)}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={handleSwitchToAdvanced}
            disabled={saving}
          >
            <Text style={styles.switchBtnText}>Switch to Advanced</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.publishBtn}
            onPress={handlePublish}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.publishBtnText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}