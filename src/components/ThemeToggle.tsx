import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme";
import { EASE_OUT } from "../motion";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} style={{ display: "grid" }}
          initial={{ opacity: 0, rotate: -60, scale: 0.7 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 60, scale: 0.7 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}>
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
