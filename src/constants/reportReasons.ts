import { ReportReason } from "../types/safety";

export interface ReportReasonMeta {
  value: ReportReason;
  label: string;
  description: string;
  emoji: string;
}

export const REPORT_REASONS: ReportReasonMeta[] = [
  {
    value: "harassment",
    label: "Harassment",
    description: "Abusive messages, threats, or unwanted advances",
    emoji: "🚫",
  },
  {
    value: "fake_profile",
    label: "Fake profile",
    description: "Catfishing, stolen photos, or impersonation",
    emoji: "🎭",
  },
  {
    value: "quality",
    label: "Quality issue",
    description: "Host didn't deliver what was promised",
    emoji: "⚠️",
  },
  {
    value: "safety",
    label: "Safety concern",
    description: "Unsafe venue, risky behavior, or illegal activity",
    emoji: "🛡️",
  },
  {
    value: "fraud",
    label: "Fraud / scam",
    description: "Tried to scam money or trick users",
    emoji: "💸",
  },
  {
    value: "misuse",
    label: "Misuse of platform",
    description: "Using Harbor for dating, ads, or off-platform deals",
    emoji: "🔞",
  },
  {
    value: "spam",
    label: "Spam",
    description: "Repeated or irrelevant content",
    emoji: "📢",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed here",
    emoji: "❓",
  },
];