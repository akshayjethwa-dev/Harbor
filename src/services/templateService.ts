import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plan } from "../types/plan";
import { GarbaCrewUser } from "../types/user";
import { PlanTemplate, PlanTemplateDraft } from "../types/planTemplate";

/**
 * Save a Plan as a reusable template.
 * The template captures the "shape" — not the date/time.
 */
export async function savePlanAsTemplate(
  plan: Plan,
  owner: GarbaCrewUser,
  templateName?: string
): Promise<string> {
  const name = (templateName ?? plan.title).trim().slice(0, 60);
  if (!name) throw new Error("Template name is required");

  const ref = doc(collection(db, "planTemplates"));
  await setDoc(ref, {
    ownerUid: owner.uid,
    name,
    nameLower: name.toLowerCase(),
    activity: plan.activity,
    activityCustom: plan.activityCustom ?? "",
    title: plan.title,
    description: plan.description,
    durationMinutes: plan.durationMinutes,
    locationName: plan.locationName,
    locationAddress: plan.locationAddress,
    city: plan.city,
    latitude: plan.latitude ?? null,
    longitude: plan.longitude ?? null,
    capacity: plan.capacity,
    costTotal: plan.costTotal,
    requirements: plan.requirements,
    approvalMode: plan.approvalMode,
    visibility: plan.visibility,
    usedCount: 0,
    lastUsedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function listMyTemplates(
  ownerUid: string
): Promise<PlanTemplate[]> {
  const q = query(
    collection(db, "planTemplates"),
    where("ownerUid", "==", ownerUid),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlanTemplate));
}

export async function getTemplate(
  templateId: string
): Promise<PlanTemplate | null> {
  const snap = await getDoc(doc(db, "planTemplates", templateId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PlanTemplate;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, "planTemplates", templateId));
}

/**
 * Called when a user "uses" a template to create a new Plan.
 * Bumps the usage counter so we can surface most-used templates first.
 */
export async function markTemplateUsed(templateId: string): Promise<void> {
  await updateDoc(doc(db, "planTemplates", templateId), {
    usedCount: increment(1),
    lastUsedAt: serverTimestamp(),
  });
}

/**
 * Converts a template + a fresh date/time into a partial PlanDraft
 * that the create wizard can pre-fill.
 */
export function templateToPlanDraftPartial(
  template: PlanTemplate,
  startDate: Date,
  startTime: string
): Partial<PlanTemplateDraft> & {
  startDate: Date;
  startTime: string;
} {
  return {
    activity: template.activity,
    activityCustom: template.activityCustom ?? "",
    title: template.title,
    description: template.description,
    durationMinutes: template.durationMinutes,
    locationName: template.locationName,
    locationAddress: template.locationAddress,
    city: template.city,
    latitude: template.latitude,
    longitude: template.longitude,
    capacity: template.capacity,
    costTotal: template.costTotal,
    requirements: template.requirements,
    approvalMode: template.approvalMode,
    visibility: template.visibility,
    startDate,
    startTime,
  };
}