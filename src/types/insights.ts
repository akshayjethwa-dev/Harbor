// src/types/insights.ts
export interface PlanInsights {
  rsvpRate: number; // percentage
  spotsFilled: number;
  capacity: number;
  
  taskCompletionRate: number; // percentage
  totalTasks: number;
  completedTasks: number;
  
  budget: number;
  actualSpend: number;
  
  averageRating: number | null; // null if not enough data
  totalRatings: number;
  hasEnoughRatings: boolean;
}