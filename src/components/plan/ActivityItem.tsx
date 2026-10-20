// src/components/plan/ActivityItem.tsx
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { PlanActivity } from "../../types/activity";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  activity: PlanActivity;
  isFormerMember: boolean;
}

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flexDirection: "row", marginBottom: 20 },
  timeline: { width: 40, alignItems: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.bgSubtle,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 14, fontWeight: "700", color: c.textMuted },
  line: { width: 2, flex: 1, backgroundColor: c.border, marginTop: 8 },
  content: {
    flex: 1, marginLeft: 12, backgroundColor: c.bgElevated, padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: c.border,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  actorName: { fontSize: 14, fontWeight: "700", color: c.text },
  time: { fontSize: 11, color: c.textMuted },
  actionText: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
  highlight: { fontWeight: "700", color: c.text },
  deletedText: { fontStyle: "italic", color: c.danger },
});

export default function ActivityItem({ activity, isFormerMember }: Props) {
  const styles = useThemedStyles(makeStyles);

  if (activity.isDeleted) {
    return (
      <View style={styles.container}>
        <View style={styles.timeline}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>?</Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.deletedText}>[This activity was deleted]</Text>
        </View>
      </View>
    );
  }

  let actionText: React.ReactNode = "";

  switch (activity.type) {
    case "task_completed":
      actionText = <>completed the task <Text style={styles.highlight}>{activity.metadata.taskTitle}</Text></>;
      break;
    case "expense_added":
      actionText = <>logged an expense of <Text style={styles.highlight}>₹{activity.metadata.amount}</Text> for {activity.metadata.description}</>;
      break;
    case "date_changed":
      actionText = <>changed the plan date to <Text style={styles.highlight}>{activity.metadata.newDate}</Text></>;
      break;
    case "member_joined":
      actionText = <>joined the plan.</>;
      break;
    case "idea_proposed":
      actionText = <>proposed an idea: <Text style={styles.highlight}>"{activity.metadata.idea}"</Text></>;
      break;
    case "comment_added":
      actionText = <>commented: <Text style={styles.highlight}>"{activity.metadata.comment}"</Text></>;
      break;
    default:
      actionText = <>did something.</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.timeline}>
        {activity.actorPhotoUrl ? (
          <Image source={{ uri: activity.actorPhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{activity.actorName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.line} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.actorName}>
            {activity.actorName} {isFormerMember && "(former member)"}
          </Text>
          <Text style={styles.time}>{timeAgo(activity.createdAt)}</Text>
        </View>
        <Text style={styles.actionText}>{actionText}</Text>
      </View>
    </View>
  );
}