import type { StorybookConfig } from "@storybook/react-vite";

// The smallest Storybook that builds the stories: the React with Vite framework and no
// addon. The repository's own tests scan and drive the static build.
const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../src/**/*.stories.tsx"],
  addons: [],
  core: { disableTelemetry: true, enableCrashReports: false },
  // Prop tables belong to the documentation addon, which is not installed.
  typescript: { reactDocgen: false },
};

export default config;
