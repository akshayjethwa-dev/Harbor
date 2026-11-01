// app/profile/edit.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import {
  getUserProfile,
  addProfilePhoto,
  removeProfilePhoto,
  updateUserProfile,
} from "../../src/services/userService";
import { GarbaCrewUser } from "../../src/types/user";
import PhotoUploadGrid from "../../src/components/profile/PhotoUploadGrid";
import FormError from "../../src/components/common/FormError"; // <-- NEW IMPORT

export default function EditProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<GarbaCrewUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");

  // NEW: Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const data = await getUserProfile(user.uid);
      if (data) {
        setProfile(data);
        setName(data.name || "");
        setBio(data.bio || "");
        setCity(data.city || "");
        setAge(data.age?.toString() || "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAddPhoto = async () => {
    if (!user) return;
    setIsUploading(true);
    
    const newUrl = await addProfilePhoto(user.uid);
    
    if (newUrl) {
      const updatedProfile = await getUserProfile(user.uid);
      setProfile(updatedProfile);
    }
    
    setIsUploading(false);
  };

  const handleRemovePhoto = async (url: string) => {
    if (!user) return;
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to delete this photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setProfile((prev) => {
              if (!prev) return prev;
              const remaining = (prev.photos || []).filter((p) => p !== url);
              return {
                ...prev,
                photos: remaining,
                photoUrl: prev.photoUrl === url ? (remaining[0] || null) : prev.photoUrl,
              };
            });

            await removeProfilePhoto(user.uid, url);
            const updatedProfile = await getUserProfile(user.uid);
            setProfile(updatedProfile);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    // NEW: Validate and set inline errors instead of Alert
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Name is required. Please enter your name.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        name: name.trim(),
        bio: bio.trim(),
        city: city.trim(),
        age: age ? parseInt(age, 10) : undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const photosToShow = profile.photos && profile.photos.length > 0 
    ? profile.photos 
    : profile.photoUrl ? [profile.photoUrl] : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} disabled={saving}>
          <Text style={[styles.cancelBtn, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <PhotoUploadGrid
            photos={photosToShow}
            isUploading={isUploading}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
          />

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Name</Text>
            <TextInput
              style={[
                styles.input, 
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSubtle },
                errors.name && { borderColor: colors.danger } // Highlight red if error
              ]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" })); // Clear error on type
              }}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
            />
            {/* NEW: Accessible inline error message */}
            <FormError message={errors.name} />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSubtle }]}
              value={age}
              onChangeText={setAge}
              placeholder="Your age"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>City</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSubtle }]}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Mumbai"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSubtle }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others about yourself..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>
              {bio.length}/200
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelBtn: { fontSize: 16, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  saveBtn: { fontSize: 16, fontWeight: "700" },
  scrollContent: { padding: 20, paddingBottom: 60 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    paddingBottom: 16,
  },
  charCount: {
    textAlign: "right",
    fontSize: 12,
    marginTop: 4,
  },
});