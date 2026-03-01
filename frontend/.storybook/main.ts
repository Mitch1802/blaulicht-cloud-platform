import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/angular",
  webpackFinal: async (baseConfig, { configType }) => {
    const nodeEnv = configType === 'PRODUCTION' ? 'production' : 'development';
    const plugins = baseConfig.plugins ?? [];

    for (const plugin of plugins as Array<{ constructor?: { name?: string }; definitions?: Record<string, unknown> }>) {
      if (plugin?.constructor?.name !== 'DefinePlugin' || !plugin.definitions) {
        continue;
      }

      plugin.definitions['process.env.NODE_ENV'] = JSON.stringify(nodeEnv);
    }

    return {
      ...baseConfig,
      plugins,
    };
  },
};
export default config;