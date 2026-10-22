import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";
import { Plan } from "../types/plan";

export async function addPlanToCalendar(plan: Plan): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Calendar access denied",
        "Enable calendar access in settings to add this Plan."
      );
      return false;
    }

    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT
    );
    const writable = calendars.find((c) => c.allowsModifications);

    if (!writable) {
      Alert.alert("No calendar found", "Create a calendar first.");
      return false;
    }

    const startDate = plan.startTime.toDate
      ? plan.startTime.toDate()
      : new Date(plan.startTime);
    const endDate = plan.endTime.toDate
      ? plan.endTime.toDate()
      : new Date(plan.endTime);

    await Calendar.createEventAsync(writable.id, {
      title: plan.title,
      notes: plan.description || `Hosted by ${plan.hostName} on Kithra`,
      startDate,
      endDate,
      location: `${plan.locationName}, ${plan.city}`,
      alarms: [
        { relativeOffset: -120 }, // 2 hours before
        { relativeOffset: -1440 }, // 24 hours before
      ],
    });

    Alert.alert("Added!", "This Plan is now in your calendar.");
    return true;
  } catch (error: any) {
    console.error("Calendar error:", error);
    Alert.alert("Couldn't add to calendar", error.message);
    return false;
  }
}