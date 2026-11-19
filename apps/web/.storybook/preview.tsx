import { useLayoutEffect, type ReactNode } from "react";
import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

function ThemePreview({
  theme,
  children,
}: {
  theme: string;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.toggle("dark", theme === "dark");
    return () => {
      root.classList.toggle("dark", wasDark);
    };
  }, [theme]);
  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      {children}
    </div>
  );
}

const preview: Preview = {
  globalTypes: {
    theme: {
      toolbar: { icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => (
      <ThemePreview theme={context.globals.theme}>
        <Story />
      </ThemePreview>
    ),
  ],
};
export default preview;
