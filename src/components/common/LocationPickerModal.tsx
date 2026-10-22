// src/components/common/LocationPickerModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { INDIAN_CITIES } from '../../constants/cities';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, Typography } from '../../constants/theme';
// ✅ Import the new geocoding helper
import { reverseGeocode } from '../../lib/geocoding';

type Props = {
  visible: boolean;
  currentCity?: string;
  onClose: () => void;
  onSelectCity: (city: string) => void;
};

export default function LocationPickerModal({
  visible,
  currentCity,
  onClose,
  onSelectCity,
}: Props) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const filteredCities = INDIAN_CITIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied', 
          'Please enable location services in your settings to use this feature.'
        );
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // ✅ Use our custom fetch-based geocoder instead of the broken Expo method
      const detectedCity = await reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      if (detectedCity) {
        // Find closest match in our list to ensure consistency
        const matchedCity = INDIAN_CITIES.find(
          c => c.toLowerCase() === detectedCity.toLowerCase()
        ) || detectedCity;
        
        onSelectCity(matchedCity);
        onClose();
      } else {
        Alert.alert('Error', 'Could not determine your city from GPS.');
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Change Location</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close location picker"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* GPS Button */}
          <TouchableOpacity
            style={[styles.gpsBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="location" size={20} color={colors.primary} />
            )}
            <Text style={[styles.gpsBtnText, { color: colors.primary }]}>
              {isLocating ? 'Detecting location...' : 'Use My Current Location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.textMuted }]}>OR SEARCH</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.bgSubtle }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search for a city..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search cities"
            />
          </View>

          {/* City List */}
          <FlatList
            data={filteredCities}
            keyExtractor={(item, index) => `${item}-${index}`}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item === currentCity;
              return (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    onSelectCity(item);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Select ${item}`}
                >
                  <Text
                    style={[
                      styles.cityText,
                      { color: isSelected ? colors.primary : colors.text },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No cities found matching "{search}"
              </Text>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  title: { ...Typography.title2, fontWeight: '700' },
  closeBtn: { padding: Spacing.xs },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
    gap: Spacing.sm,
    minHeight: 48,
  },
  gpsBtnText: {
    ...Typography.subhead,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    ...Typography.label,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.body,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    marginTop: Spacing.md,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  cityText: { ...Typography.body },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});