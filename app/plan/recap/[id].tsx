// app/plan/recap/[id].tsx
import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  Share,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Plan } from "../../../src/types/plan";
import { PlanPhoto } from "../../../src/types/photo";
import { PlanExpense } from "../../../src/types/expense";
import { PlanTask } from "../../../src/types/task";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";
import RecapCard from "../../../src/components/plan/RecapCard";

export default function PlanRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  
  const viewShotRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [photos, setPhotos] = useState<PlanPhoto[]>([]);
  const [expenses, setExpenses] = useState<PlanExpense[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        const planSnap = await getDoc(doc(db, "plans", id));
        if (!planSnap.exists()) return;
        setPlan({ id: planSnap.id, ...planSnap.data() } as Plan);

        const [photosSnap, expensesSnap, tasksSnap] = await Promise.all([
          getDocs(collection(db, "plans", id, "photos")),
          getDocs(collection(db, "plans", id, "expenses")),
          getDocs(collection(db, "plans", id, "tasks"))
        ]);

        setPhotos(photosSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanPhoto)));
        setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanExpense)));
        setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanTask)));
      } catch (e) {
        console.warn("Recap fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleShare = () => {
    if (!plan) return;
    
    Alert.alert(
      "Share Recap",
      "How would you like to share this memory?",
      [
        { text: "Share as Image", onPress: shareImage },
        { text: "Share Link", onPress: shareLink },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const shareImage = async () => {
    if (!viewShotRef.current) return;
    setIsSharing(true);
    try {
      const uri = await viewShotRef.current.capture();
      
      // Web Fallback: Trigger a file download instead of native share
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = uri;
        link.download = `Kithra-recap-${plan?.id}.jpg`;
        link.click();
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { 
          dialogTitle: "Share Plan Recap",
          mimeType: "image/jpeg",
          UTI: "public.jpeg"
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (e: any) {
      Alert.alert("Error", "Could not generate image.");
    } finally {
      setIsSharing(false);
    }
  };

  const shareLink = async () => {
    if (!plan) return;
    
    // We provide a web fallback URL alongside the deep link
    const webUrl = `https://Kithra.app/plan/${plan.id}`; 
    const message = `Check out the recap from our plan "${plan.title}"! 🧡\n\n${webUrl}`;

    try {
      await Share.share({
        message,
        url: webUrl, 
        title: `Recap: ${plan.title}`
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recap</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={isSharing || loading}>
          {isSharing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.shareText}>Share</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : !plan ? (
        <View style={styles.center}><Text>Plan not found.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }}>
            <RecapCard 
              plan={plan} 
              photos={photos} 
              expenses={expenses} 
              tasks={tasks} 
            />
          </ViewShot>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 16, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { padding: 8, marginLeft: -8 },
    backIcon: { fontSize: 22, color: c.text },
    headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
    shareBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.primary + "11", borderRadius: 8 },
    shareText: { color: c.primary, fontWeight: "700", fontSize: 14 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { padding: 16 },
  });