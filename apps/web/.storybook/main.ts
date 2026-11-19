import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  core: {
    disableTelemetry: true,
    builder: {
      name: "@storybook/builder-vite",
      options: {
        viteConfigPath: new URL("./vite.config.ts", import.meta.url).pathname,
      },
    },
  },
  // Keep router generation and Sentry out of the isolated component workshop.
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    const { default: react } = await import("@vitejs/plugin-react");
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    return mergeConfig(config, {
      plugins: [react(), tailwindcss()],
      resolve: { alias: { "@": new URL("../src", import.meta.url).pathname } },
    });
  },
};
export default config;
