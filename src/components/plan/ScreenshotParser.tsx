// src/components/plan/ScreenshotParser.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { extractTextFromImage, parseUPIText, ParsedExpense } from "../../utils/ocrParser";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  onParsed: (data: ParsedExpense) => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    borderWidth: 1.5, borderColor: c.border, borderStyle: "dashed",
    borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 16,
  },
  icon: { fontSize: 32, marginBottom: 8 },
  text: { fontSize: 14, fontWeight: "600", color: c.primary },
  sub: { fontSize: 12, color: c.textMuted, marginTop: 4, textAlign: "center" },
  imagePreview: { width: "100%", height: 150, borderRadius: 8, marginTop: 12, resizeMode: "contain" },
  loadingBox: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, color: c.primary, fontWeight: "600" },
});

export default function ScreenshotParser({ onParsed }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImage(uri);
      processImage(uri);
    }
  };

  const processImage = async (uri: string) => {
    setLoading(true);
    try {
      // 1. Get Text from OCR
      const text = await extractTextFromImage(uri);
      
      // 2. Parse Text
      const parsed = parseUPIText(text);

      // 3. Validate Edge Cases
      if (parsed.isFailed) {
        Alert.alert("Payment Failed", "This screenshot shows a failed transaction. Please use a successful one.");
        setImage(null);
        return;
      }

      if (parsed.amount === null) {
        Alert.alert("Unreadable", "Could not read the amount. Please enter manually.");
        setImage(null);
        return;
      }

      if (parsed.isAmountAmbiguous) {
        Alert.alert("Multiple Amounts", "Multiple amounts found in the image. Please double-check the pre-filled value.");
      }

      // 4. Send back to form
      onParsed(parsed);

    } catch (e: any) {
      Alert.alert("OCR Error", "Could not parse image. Please enter manually.");
      setImage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePickImage} disabled={loading}>
      {!image && !loading && (
        <>
          <Text style={styles.icon}>🖼️</Text>
          <Text style={styles.text}>Upload Payment Screenshot</Text>
          <Text style={styles.sub}>Auto-fill amount, payee, and date from GPay, PhonePe, or Paytm.</Text>
        </>
      )}

      {image && (
        <Image source={{ uri: image }} style={styles.imagePreview} />
      )}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={styles.text.color} />
          <Text style={styles.loadingText}>Scanning screenshot...</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}