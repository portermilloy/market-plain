"use client";

import { useTheme } from "../context/ThemeContext";
import MarketStatus from "./MarketStatus";
import NavLinks from "./NavLinks";
import ThemeToggle from "./ThemeToggle";

export default function ThemedHeader() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <header
      style={{
        backgroundColor: isLight ? "#ffffff" : "#09090b",
        borderBottomColor: isLight ? "#7f8ea3" : "#27272a",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <span
            className="text-lg font-semibold tracking-tight shrink-0"
            style={{ color: isLight ? "#0f172a" : "#ffffff" }}
          >
            Market Plain
          </span>
          <NavLinks />
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <MarketStatus />
          </div>
        </div>
      </div>
    </header>
  );
}
