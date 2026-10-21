// src/constants/badges.ts
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "first_plan",
    name: "First Steps",
    description: "Created your first Plan on Harbor.",
    icon: "🌱",
    color: "#4CAF50", // Green
  },
  {
    id: "ten_plans",
    name: "Crowd Favorite",
    description: "Created 10 Plans.",
    icon: "🔥",
    color: "#FF9800", // Orange
  },
  {
    id: "hundred_plans",
    name: "Legend",
    description: "Created 100 Plans. You are a pillar of the community.",
    icon: "👑",
    color: "#9C27B0", // Purple
  },
  {
    id: "squad_builder",
    name: "Squad Builder",
    description: "Created your first Squad.",
    icon: "🛡️",
    color: "#2196F3", // Blue
  },
  {
    id: "frequent_flyer",
    name: "Frequent Flyer",
    description: "Joined 10 Plans as a participant.",
    icon: "✈️",
    color: "#00BCD4", // Cyan
  },
  {
    id: "big_spender",
    name: "Big Spender",
    description: "Logged over ₹10,000 in shared expenses.",
    icon: "💸",
    color: "#E91E63", // Pink
  },
];

// Helper to get a badge by ID
export function getBadgeMeta(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}