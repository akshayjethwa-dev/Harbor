// src/types/taskTemplate.ts
import { Timestamp } from "firebase/firestore";
import { TaskPriority } from "./task";

export interface TemplateTask {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  order: number;
}

export interface TaskTemplate {
  id: string;
  ownerUid: string;
  name: string;
  tasks: TemplateTask[];
  createdAt: Timestamp | any;
}