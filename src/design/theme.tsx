import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { elevation, palette, type ColorScheme } from "./tokens";

type Theme = {
  scheme: ColorScheme;
  colors: ReturnType<typeof palette>;
  elevation: ReturnType<typeof elevation>;
};

const ThemeContext = createContext<Theme | null>(null);

/** Follows the OS appearance unless `scheme` is forced (used by the preview). */
export function ThemeProvider({ scheme, children }: { scheme?: ColorScheme; children: ReactNode }) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === "dark" ? "dark" : "light");
  const value = useMemo(
    () => ({ scheme: resolved, colors: palette(resolved), elevation: elevation(resolved) }),
    [resolved],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside <ThemeProvider>");
  return theme;
}
