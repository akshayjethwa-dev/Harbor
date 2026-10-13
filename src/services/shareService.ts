import { Share } from "react-native";
import { Plan } from "../types/plan";
import { Squad } from "../types/squad";

export async function sharePlan(plan: Plan): Promise<void> {
  const url = `https://garbacrew.app/plan/${plan.id}`;
  const message = `Join "${plan.title}" on GarbaCrew!\n${url}`;
  await Share.share({
    message,
    url,
    title: plan.title,
  });
}

export async function shareSquad(squad: Squad): Promise<void> {
  const url = `https://garbacrew.app/squad/${squad.id}`;
  const message = `Join "${squad.name}" on GarbaCrew!\n${url}`;
  await Share.share({
    message,
    url,
    title: squad.name,
  });
}

export function planShareUrl(planId: string): string {
  return `https://garbacrew.app/plan/${planId}`;
}

export function squadShareUrl(squadId: string): string {
  return `https://garbacrew.app/squad/${squadId}`;
}