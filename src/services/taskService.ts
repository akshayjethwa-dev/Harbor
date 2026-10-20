// src/services/taskService.ts
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
  runTransaction,
  getDocs,
} from "firebase/firestore";
import { PlanTask, TaskPriority } from "../types/task";
import { TaskTemplate, TemplateTask } from "../types/taskTemplate";
import { GarbaCrewUser } from "../types/user";
import { logActivity } from "./activityService"; // <-- Added

const tasksRef = (planId: string) => collection(db, "plans", planId, "tasks");

/**
 * Task 6: Subscribe to tasks for a plan.
 */
export function subscribeToTasks(
  planId: string,
  callback: (tasks: PlanTask[]) => void
) {
  const q = query(tasksRef(planId), orderBy("order", "asc"));
  
  return onSnapshot(q, (snap) => {
    const tasks = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        planId,
        ...data,
        title: data.title || "Untitled Task",
        priority: (data.priority as TaskPriority) || "medium",
      } as PlanTask;
    });
    callback(tasks);
  });
}

/**
 * Task 6: Add a new task.
 */
export async function createTask(
  planId: string,
  task: {
    title: string;
    description: string;
    assigneeUid: string | null;
    assigneeName: string | null;
    assigneePhotoUrl: string | null;
    dueDate: Timestamp | null;
    priority: TaskPriority;
    category: string;
  },
  currentMaxOrder: number
): Promise<string> {
  const docRef = await addDoc(tasksRef(planId), {
    ...task,
    order: currentMaxOrder + 1,
    isArchived: false,
    isCompleted: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Task 6: Update an existing task.
 */
export async function updateTask(
  planId: string,
  taskId: string,
  updates: Partial<PlanTask>
): Promise<void> {
  const { id, planId: pid, createdAt, ...safeUpdates } = updates;
  
  if (safeUpdates.assigneeUid === null) {
    safeUpdates.assigneeName = null;
    safeUpdates.assigneePhotoUrl = null;
    safeUpdates.claimedAt = null;
  }
  
  await updateDoc(doc(db, "plans", planId, "tasks", taskId), safeUpdates);
}

/**
 * Task 6: Delete a task.
 */
export async function deleteTask(planId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, "plans", planId, "tasks", taskId));
}

/**
 * Task 6: Reorder tasks after drag-and-drop.
 */
export async function reorderTasks(
  planId: string,
  tasks: PlanTask[]
): Promise<void> {
  const batch = writeBatch(db);
  
  tasks.forEach((task, index) => {
    if (task.order !== index) {
      const ref = doc(db, "plans", planId, "tasks", task.id);
      batch.update(ref, { order: index });
    }
  });

  await batch.commit();
}

/**
 * Task 7: Assignee declines the task.
 */
export async function declineTask(planId: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "tasks", taskId), {
    assigneeUid: null,
    assigneeName: null,
    assigneePhotoUrl: null,
    claimedAt: null,
  });
}

/**
 * Task 8: Self-Claim a task atomically.
 */
export async function claimTask(
  planId: string,
  taskId: string,
  user: GarbaCrewUser
): Promise<void> {
  const taskRef = doc(db, "plans", planId, "tasks", taskId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(taskRef);
    if (!snap.exists()) throw new Error("Task not found.");

    const data = snap.data() as PlanTask;
    if (data.assigneeUid) {
      throw new Error("Task is already claimed.");
    }

    tx.update(taskRef, {
      assigneeUid: user.uid,
      assigneeName: user.name || "Unknown",
      assigneePhotoUrl: user.photoUrl || null,
      claimedAt: serverTimestamp(),
    });
  });
}

/**
 * Task 8: Unclaim a task.
 */
export async function unclaimTask(planId: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "tasks", taskId), {
    assigneeUid: null,
    assigneeName: null,
    assigneePhotoUrl: null,
    claimedAt: null,
  });
}

/**
 * Task 9: Mark a task as complete and log to the activity feed.
 */
export async function completeTask(
  planId: string,
  taskId: string,
  taskTitle: string,
  user: GarbaCrewUser,
  isLate: boolean
): Promise<void> {
  const taskRef = doc(db, "plans", planId, "tasks", taskId);

  await updateDoc(taskRef, {
    isCompleted: true,
    completedAt: serverTimestamp(),
    completedBy: user.uid,
    completedByName: user.name || "Someone",
    completedLate: isLate,
  });

  // Task 19: Use new plan activity feed
  await logActivity(planId, "task_completed", {
    uid: user.uid,
    name: user.name || "Someone",
    photoUrl: user.photoUrl || null
  }, { taskTitle }, false);
}

/**
 * Task 9: Undo completion / Reopen task.
 */
export async function undoCompleteTask(
  planId: string,
  taskId: string
): Promise<void> {
  const taskRef = doc(db, "plans", planId, "tasks", taskId);

  await updateDoc(taskRef, {
    isCompleted: false,
    completedAt: null,
    completedBy: null,
    completedByName: null,
    completedLate: false,
  });
}

// ─────────────────────────────────────────────
// Task 11: Task Templates
// ─────────────────────────────────────────────

/**
 * Save current active tasks as a reusable template.
 */
export async function savePlanTasksAsTemplate(
  planId: string,
  ownerUid: string,
  templateName: string,
  activeTasks: PlanTask[]
): Promise<void> {
  const templateTasks: TemplateTask[] = activeTasks
    .filter((t) => !t.isCompleted)
    .map((t, index) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      order: index, 
    }));

  await addDoc(collection(db, "taskTemplates"), {
    ownerUid,
    name: templateName,
    tasks: templateTasks,
    createdAt: serverTimestamp(),
  });
}

/**
 * Fetch all task templates for an organizer.
 */
export async function getTaskTemplates(ownerUid: string): Promise<TaskTemplate[]> {
  const q = query(
    collection(db, "taskTemplates"),
    where("ownerUid", "==", ownerUid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskTemplate));
}

/**
 * Apply a template to a plan (clone tasks).
 */
export async function applyTaskTemplate(
  planId: string,
  template: TaskTemplate,
  currentMaxOrder: number
): Promise<void> {
  const batch = writeBatch(db);
  const tasksRef = collection(db, "plans", planId, "tasks");

  template.tasks.forEach((t, index) => {
    const newTaskRef = doc(tasksRef);
    batch.set(newTaskRef, {
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      order: currentMaxOrder + index + 1,
      assigneeUid: null,
      assigneeName: null,
      assigneePhotoUrl: null,
      dueDate: null,
      isArchived: false,
      isCompleted: false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/**
 * Delete a template.
 */
export async function deleteTaskTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, "taskTemplates", templateId));
}