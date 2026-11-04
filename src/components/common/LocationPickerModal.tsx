// src/components/common/LocationPickerModal.tsx
import React, { useState, useEffect } from 'react';
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
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Reset permission state when modal opens
  useEffect(() => {
    if (visible) {
      setPermissionDenied(false);
      setSearch('');
    }
  }, [visible]);

  const filteredCities = INDIAN_CITIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setPermissionDenied(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setPermissionDenied(true);
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const detectedCity = await reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      if (detectedCity) {
        const matchedCity =
          INDIAN_CITIES.find(
            (c) => c.toLowerCase() === detectedCity.toLowerCase()
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

  const handleManualCitySelect = (city: string) => {
    onSelectCity(city);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Change Location
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Rationale (always visible, emphasized if permission denied) */}
          <View
            style={[
              styles.rationaleBox,
              {
                backgroundColor: permissionDenied
                  ? colors.warning + '15'
                  : colors.bgSubtle,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={permissionDenied ? colors.warning : colors.textSecondary}
            />
            <Text
              style={[
                styles.rationaleText,
                {
                  color: permissionDenied ? colors.warning : colors.textSecondary,
                },
              ]}
            >
              {permissionDenied
                ? 'We need your city to show plans near you. You can change this anytime.'
                : 'Choose a city or use your current location.'}
            </Text>
          </View>

          {/* GPS Button */}
          <TouchableOpacity
            style={[
              styles.gpsBtn,
              { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
            ]}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="locate" size={20} color={colors.primary} />
                <Text style={[styles.gpsBtnText, { color: colors.primary }]}>
                  Use My Current Location
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>
              OR SEARCH
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Search Bar */}
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.bgSubtle,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Search cities..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />

          {/* City List */}
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item === currentCity;
              return (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleManualCitySelect(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Select ${item}`}
                >
                  <Text
                    style={[
                      styles.cityText,
                      { color: isSelected ? colors.primary : colors.text },
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
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
  rationaleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Spacing.sm,
    gap: Spacing.sm,
  },
  rationaleText: { flex: 1, fontSize: 13, lineHeight: 18 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  gpsBtnText: { ...Typography.body, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  searchInput: {
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.sm,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  listContent: { paddingBottom: Spacing.xl },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  cityText: { ...Typography.body },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: 14,
  },
});