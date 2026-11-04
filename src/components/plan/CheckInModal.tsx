// src/components/plan/CheckInModal.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { checkInToPlan } from "../../services/checkinService"; // ✅ FIXED IMPORT
import { Plan } from "../../types/plan";

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: Plan;
  role: "host" | "attendee";
}

export default function CheckInModal({ visible, onClose, plan, role }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const qrValue = `harbor://checkin/${plan.id}`;

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanning || checkingIn || !user) return;
    
    if (!data.includes(plan.id)) {
      Alert.alert("Invalid QR", "This QR code is not for this event.");
      return;
    }

    setScanning(true);
    setCheckingIn(true);

    try {
      await checkInToPlan(plan.id, user); // ✅ FIXED FUNCTION CALL
      Alert.alert("Success 🎉", "You are checked in!");
      onClose();
    } catch (e: any) {
      Alert.alert("Check-in Failed", e.message || "Could not check you in.");
    } finally {
      setCheckingIn(false);
      setScanning(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {role === "host" ? "Scan to Check In" : "Check In"}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {role === "host" && (
            <View style={styles.qrContainer}>
              <QRCode value={qrValue} size={240} />
              <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                Show this to attendees to scan.
              </Text>
            </View>
          )}

          {role === "attendee" && (
            <View style={styles.scannerContainer}>
              {!permission ? (
                <View style={styles.center}>
                  <Text style={{ color: colors.text }}>Requesting camera permission...</Text>
                </View>
              ) : !permission.granted ? (
                <View style={styles.center}>
                  <Text style={[styles.permText, { color: colors.text }]}>
                    We need camera access to scan the QR code.
                  </Text>
                  <TouchableOpacity style={[styles.permBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
                    <Text style={{ color: colors.textInverse, fontWeight: "700" }}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <CameraView
                  style={StyleSheet.absoluteFill} // ✅ FIXED STYLE
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={handleBarCodeScanned}
                >
                  <View style={styles.overlayTarget}>
                    <View style={styles.scanBox} />
                    {checkingIn && (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ color: "#FFF", marginTop: 8 }}>Checking in...</Text>
                      </View>
                    )}
                  </View>
                </CameraView>
              )}
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  qrContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  instruction: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  scannerContainer: {
    height: 300,
    width: "100%",
    backgroundColor: "#000",
    position: "relative",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permText: { textAlign: "center", marginBottom: 16, fontSize: 15 },
  permBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  overlayTarget: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanBox: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "#FFF",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute", // ✅ FIXED STYLE SPREAD
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});