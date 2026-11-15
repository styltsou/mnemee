import * as React from "react";

import { changeAppearance, useAppearance } from "@/lib/appearance";
import type { Appearance } from "@/lib/appearance-cache";

type Theme = Appearance["theme"];
type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
    return "dark";
  }

  return "light";
}

/** Keeps the tab icon and the browser's UI colour in step with the theme the user chose, not just the system's. */
function syncBrowserChrome(theme: ResolvedTheme) {
  document
    .querySelector('link[rel="icon"]')
    ?.setAttribute(
      "href",
      theme === "dark"
        ? "/mnemee-favicon-dark.svg"
        : "/mnemee-favicon-light.svg",
    );

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    "content",
    theme === "dark" ? "oklch(0.145 0 0)" : "#ffffff",
  );
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove();
      });
    });
  };
}

function setTheme(theme: Theme) {
  changeAppearance({ theme });
}

export function ThemeProvider({
  children,
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  const theme = useAppearance((state) => state.theme);

  const applyTheme = React.useCallback(
    (nextTheme: Theme) => {
      const root = document.documentElement;
      const resolvedTheme =
        nextTheme === "system" ? getSystemTheme() : nextTheme;
      if (root.classList.contains(resolvedTheme)) return;

      const restoreTransitions = disableTransitionOnChange
        ? disableTransitionsTemporarily()
        : null;

      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
      syncBrowserChrome(resolvedTheme);

      if (restoreTransitions) {
        restoreTransitions();
      }
    },
    [disableTransitionOnChange],
  );

  React.useLayoutEffect(() => {
    applyTheme(theme);

    if (theme !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme, applyTheme]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
