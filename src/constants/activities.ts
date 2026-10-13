import { PlanActivity } from "../types/plan";

export interface ActivityMeta {
  value: PlanActivity;
  label: string;
  emoji: string;
  color: string;
}

export const ACTIVITIES: ActivityMeta[] = [
  { value: "cricket", label: "Cricket", emoji: "🏏", color: "#4CAF50" },
  { value: "trek", label: "Trek", emoji: "🥾", color: "#795548" },
  { value: "garba", label: "Garba", emoji: "💃", color: "#E91E63" },
  { value: "movie", label: "Movie", emoji: "🎬", color: "#3F51B5" },
  { value: "food", label: "Food", emoji: "🍽️", color: "#FF9800" },
  { value: "party", label: "Party", emoji: "🎉", color: "#9C27B0" },
  { value: "custom", label: "Custom", emoji: "✨", color: "#607D8B" },
];

export function getActivityMeta(activity: PlanActivity): ActivityMeta {
  return ACTIVITIES.find((a) => a.value === activity) ?? ACTIVITIES[0];
}

export const CAPACITY_OPTIONS = [
  { value: 2, label: "2 people", desc: "1-on-1" },
  { value: 4, label: "4 people", desc: "Small crew" },
  { value: 6, label: "6 people", desc: "Medium crew" },
  { value: 10, label: "10 people", desc: "Big crew" },
  { value: 20, label: "20 people", desc: "Party" },
  { value: 0, label: "Unlimited", desc: "Open to all" },
];

export const DURATION_OPTIONS = [
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 360, label: "6 hours" },
  { value: 480, label: "Full day (8h)" },
];

// ─────────────────────────────────────────────────────────
// 120+ Indian cities, grouped alphabetically for easy scanning
// ─────────────────────────────────────────────────────────
export const CITIES = [
  // A
  "Agartala", "Agra", "Ahmedabad", "Aizawl", "Ajmer", "Aligarh", "Allahabad",
  "Alwar", "Ambala", "Amravati", "Amritsar", "Anand", "Aurangabad",
  // B
  "Bangalore", "Bareilly", "Belgaum", "Bengaluru", "Bhagalpur", "Bharuch",
  "Bhavnagar", "Bhilai", "Bhiwandi", "Bhopal", "Bhubaneswar", "Bikaner",
  "Bilaspur", "Bokaro",
  // C
  "Chandigarh", "Chennai", "Coimbatore", "Cuttack",
  // D
  "Dehradun", "Delhi", "Dhanbad", "Dharamshala", "Durgapur",
  // E
  "Erode",
  // F
  "Faridabad", "Firozabad",
  // G
  "Gandhinagar", "Gangtok", "Ghaziabad", "Gorakhpur", "Guntur", "Gurgaon",
  "Guwahati", "Gwalior",
  // H
  "Hisar", "Howrah", "Hubli", "Hyderabad",
  // I
  "Imphal", "Indore", "Itanagar",
  // J
  "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamnagar", "Jamshedpur",
  "Jhansi", "Jodhpur",
  // K
  "Kakinada", "Kalyan", "Kanpur", "Kochi", "Kohima", "Kolhapur", "Kolkata",
  "Kollam", "Kota", "Kozhikode", "Kurnool",
  // L
  "Lucknow", "Ludhiana",
  // M
  "Madurai", "Mangalore", "Meerut", "Moradabad", "Mumbai", "Mysore",
  // N
  "Nagpur", "Nanded", "Nashik", "Navi Mumbai", "Noida",
  // P
  "Panaji", "Patna", "Pimpri", "Pondicherry", "Prayagraj", "Pune",
  // R
  "Raipur", "Rajahmundry", "Rajkot", "Ranchi", "Rourkela",
  // S
  "Salem", "Shillong", "Shimla", "Siliguri", "Solapur", "Srinagar", "Surat",
  // T
  "Thane", "Thanjavur", "Thiruvananthapuram", "Thrissur", "Tiruchirappalli",
  "Tirunelveli", "Tirupati", "Tiruppur",
  // U
  "Udaipur", "Ujjain",
  // V
  "Vadodara", "Varanasi", "Vasai", "Vellore", "Vijayawada", "Visakhapatnam",
  // W
  "Warangal",
  // International / Other
  "Dubai", "Singapore", "London", "Toronto", "New York", "Sydney",
].sort();