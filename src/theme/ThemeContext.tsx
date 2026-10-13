import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeColors, LIGHT, DARK } from "./colors";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeState>({
  mode: "system",
  isDark: false,
  colors: LIGHT,
  setMode: () => {},
});

const STORAGE_KEY = "@garbacrew:themeMode";
const isBrowser =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Load persisted preference (browser/native only)
  useEffect(() => {
    if (!isBrowser) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      } catch {
        // Ignore
      }
    })();
  }, []);

  const setMode = async (next: ThemeMode) => {
    setModeState(next);
    if (!isBrowser) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore
    }
  };

  const isDark =
    mode === "dark" || (mode === "system" && systemScheme === "dark");

  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}