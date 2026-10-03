import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "aryst_theme";

export const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "system";
};

export const applyTheme = (theme: Theme): "light" | "dark" => {
  if (typeof document === "undefined") return "light";
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Update mobile browser chrome color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", resolved === "dark" ? "#09090B" : "#FAF8F5");
  }

  return resolved;
};

interface ThemeState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "system",
  resolvedTheme: "light",

  setTheme: (theme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
    const resolved = applyTheme(theme);
    set({ theme, resolvedTheme: resolved });
  },

  toggleTheme: () => {
    const { resolvedTheme } = get();
    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
    get().setTheme(nextTheme);
  },
}));

/** Initializes theme immediately (call before or during root render) */
export const initTheme = (): void => {
  if (typeof window === "undefined") return;
  const initialTheme = getStoredTheme();
  const resolved = applyTheme(initialTheme);
  useTheme.setState({ theme: initialTheme, resolvedTheme: resolved });

  // Listen to OS system theme changes
  try {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current = useTheme.getState().theme;
      if (current === "system") {
        const nextResolved = applyTheme("system");
        useTheme.setState({ resolvedTheme: nextResolved });
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Compatibility for older Safari / browsers
      (mediaQuery as { addListener?: (cb: () => void) => void }).addListener?.(handleChange);
    }
  } catch {
    // Media query listener not supported
  }
};
