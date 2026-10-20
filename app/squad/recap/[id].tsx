// app/squad/recap/[id].tsx
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Share, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, getDocs, collection, query, where, Timestamp } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Plan } from "../../../src/types/plan"; // <-- Added import
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";
import SquadRecapCard from "../../../src/components/squad/SquadRecapCard";

interface SquadData {
  name: string;
  memberUids: string[];
}

export default function SquadRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  
  const viewShotRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  
  // Aggregated Data State
  const [squadName, setSquadName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalPlans, setTotalPlans] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [mostActiveMember, setMostActiveMember] = useState<{ name: string; photoUrl: string | null; count: number } | null>(null);
  const [topPhotos, setTopPhotos] = useState<string[]>([]);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [attendeeAvatars, setAttendeeAvatars] = useState<(string | null)[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const fetchAndAggregate = async () => {
      try {
        const currentYear = new Date().getFullYear();
        setYear(currentYear);

        // 1. Fetch Squad
        const squadSnap = await getDoc(doc(db, "squads", id));
        if (!squadSnap.exists()) throw new Error("Squad not found");
        const squad = squadSnap.data() as SquadData;
        setSquadName(squad.name);

        // 2. Fetch Squad Members for avatars
        const membersSnap = await getDocs(query(collection(db, "users"), where("uid", "in", squad.memberUids.slice(0, 10))));
        const memberAvatars = membersSnap.docs.map(d => d.data().photoUrl || null);
        setAttendeeAvatars(memberAvatars);

        // 3. Fetch Plans for this squad in the current year
        const startOfYear = Timestamp.fromDate(new Date(currentYear, 0, 1));
        const endOfYear = Timestamp.fromDate(new Date(currentYear, 11, 31, 23, 59, 59));

        const plansQuery = query(
          collection(db, "plans"),
          where("squadId", "==", id),
          where("startTime", ">=", startOfYear),
          where("startTime", "<=", endOfYear)
        );
        const plansSnap = await getDocs(plansQuery);
        
        // FIXED: Cast the plan objects to the Plan interface so TS knows about lat/lng/participants
        const plans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
        setTotalPlans(plans.length);

        if (plans.length === 0) {
          setLoading(false);
          return;
        }

        // 4. Fetch Expenses, Photos, and Locations for all these plans
        let aggregateSpend = 0;
        const allPhotos: string[] = [];
        const allLocations: { lat: number; lng: number }[] = [];
        const memberParticipation: Record<string, number> = {};

        // Initialize participation counts
        squad.memberUids.forEach(uid => memberParticipation[uid] = 0);

        for (const plan of plans) {
          // Aggregate Spend
          const expensesSnap = await getDocs(collection(db, "plans", plan.id, "expenses"));
          expensesSnap.forEach(e => {
            aggregateSpend += e.data().amount || 0;
          });

          // Aggregate Photos
          const photosSnap = await getDocs(collection(db, "plans", plan.id, "photos"));
          photosSnap.forEach(p => allPhotos.push(p.data().url));

          // Aggregate Locations
          if (plan.latitude && plan.longitude) {
            allLocations.push({ lat: plan.latitude, lng: plan.longitude });
          }

          // Aggregate Participation
          plan.participants?.forEach((uid: string) => {
            if (memberParticipation[uid] !== undefined) {
              memberParticipation[uid]++;
            }
          });
        }

        setTotalSpent(aggregateSpend);
        setTopPhotos(allPhotos.slice(0, 4));

        // 5. Find Most Active Member
        let mvpUid = "";
        let maxCount = -1;
        Object.entries(memberParticipation).forEach(([uid, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mvpUid = uid;
          }
        });

        if (mvpUid && maxCount > 0) {
          const mvpSnap = await getDoc(doc(db, "users", mvpUid));
          if (mvpSnap.exists()) {
            setMostActiveMember({
              name: mvpSnap.data().name || "Unknown",
              photoUrl: mvpSnap.data().photoUrl || null,
              count: maxCount
            });
          }
        }

        // 6. Generate Map Image
        if (allLocations.length > 0) {
          const markers = allLocations.slice(0, 10).map(loc => `${loc.lat},${loc.lng},red-pushpin`).join("|");
          
          // Calculate bounding box for map center
          const lats = allLocations.map(l => l.lat);
          const lngs = allLocations.map(l => l.lng);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

          const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=10&size=600x300&maptype=mapnik&markers=${markers}`;
          setMapImageUrl(mapUrl);
        }

      } catch (e) {
        console.warn("Recap fetch failed:", e);
        Alert.alert("Error", "Could not generate squad recap.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndAggregate();
  }, [id]);

  const handleShare = () => {
    Alert.alert(
      "Share Year in Review",
      "How would you like to share this memory?",
      [
        { text: "Share as Image", onPress: shareImage },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const shareImage = async () => {
    if (!viewShotRef.current) return;
    setIsSharing(true);
    try {
      const uri = await viewShotRef.current.capture();
      
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = uri;
        link.download = `harbor-squad-recap-${year}.jpg`;
        link.click();
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: "Share Year in Review", mimeType: "image/jpeg", UTI: "public.jpeg" });
      }
    } catch (e: any) {
      Alert.alert("Error", "Could not generate image.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Year in Review</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={isSharing || loading}>
          {isSharing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.shareText}>Share</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 12, color: colors.textMuted }}>Crunching the numbers...</Text>
        </View>
      ) : totalPlans === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😴</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>No plans this year!</Text>
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 8, paddingHorizontal: 40 }}>
            Your squad didn't attend any plans in {year}. Time to change that!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }}>
            <SquadRecapCard
              squadName={squadName}
              year={year}
              totalPlans={totalPlans}
              totalSpent={totalSpent}
              mostActiveMember={mostActiveMember}
              topPhotos={topPhotos}
              mapImageUrl={mapImageUrl}
              attendeeAvatars={attendeeAvatars}
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