import React from "react";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  showLabel = false,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Beralih ke Mode Siang (Terang)" : "Beralih ke Mode Malam (Gelap)"}
      title={isDark ? "Beralih ke Mode Siang (Terang)" : "Beralih ke Mode Malam (Gelap)"}
      className={`relative inline-flex items-center justify-center gap-2 p-2 rounded-full transition-all select-none ${
        isDark
          ? "bg-white/[0.08] hover:bg-white/[0.14] text-amber-300 border border-white/[0.12] shadow-sm"
          : "bg-black/[0.04] hover:bg-black/[0.08] text-[#52525B] hover:text-[#121212] border border-black/[0.06] shadow-sm"
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (shown in dark mode to switch to light) */}
        <Sun
          className={`w-4 h-4 transition-transform duration-300 ${
            isDark ? "scale-100 rotate-0 opacity-100 text-amber-300" : "scale-0 -rotate-90 opacity-0 absolute"
          }`}
        />
        {/* Moon Icon (shown in light mode to switch to dark) */}
        <Moon
          className={`w-4 h-4 transition-transform duration-300 ${
            !isDark ? "scale-100 rotate-0 opacity-100 text-[#52525B]" : "scale-0 rotate-90 opacity-0 absolute"
          }`}
        />
      </div>

      {showLabel && (
        <span className="text-xs font-bold tracking-tight">
          {isDark ? "Mode Siang" : "Mode Malam"}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
