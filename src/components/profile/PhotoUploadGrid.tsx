// src/components/profile/PhotoUploadGrid.tsx
import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  photos: string[];
  isUploading: boolean;
  onAdd: () => void;
  onRemove: (url: string) => void;
}

export default function PhotoUploadGrid({
  photos,
  isUploading,
  onAdd,
  onRemove,
}: Props) {
  const { colors } = useTheme();
  const MAX_PHOTOS = 6;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>My Photos</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Add up to {MAX_PHOTOS} photos. The first photo will be your primary avatar.
      </Text>

      <View style={styles.grid}>
        {/* Render existing photos */}
        {photos.map((url, index) => (
          <View key={url} style={styles.photoSlot}>
            <Image source={{ uri: url }} style={styles.photo} />
            
            {index === 0 && (
              <View style={[styles.primaryBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(url)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Render "Add" button if under the limit */}
        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity
            style={[
              styles.photoSlot,
              styles.addBtn,
              { borderColor: colors.border, backgroundColor: colors.bgSubtle },
            ]}
            onPress={onAdd}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                <Text style={[styles.addText, { color: colors.textMuted }]}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoSlot: {
    width: "30%", // Fits roughly 3 per row
    aspectRatio: 3 / 4,
    borderRadius: 12,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  addBtn: {
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
});