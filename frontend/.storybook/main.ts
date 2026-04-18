import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Filter out vite-plugin-pwa — it breaks the Storybook build.
    // VitePWA returns an array of sub-plugins, so flatten first then filter.
    const isPwaPlugin = (p: unknown): boolean => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
      if ('name' in p) {
        const name = String((p as { name: unknown }).name);
        return name.includes('pwa') || name.includes('workbox');
      }
      return false;
    };
    config.plugins = (config.plugins ?? [])
      .flatMap((p) => (Array.isArray(p) ? p : [p]))
      .filter((p) => !isPwaPlugin(p));

    // Replicate all path aliases from vite.config.ts
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': path.resolve(__dirname, '../src'),
      '@components': path.resolve(__dirname, '../src/components'),
      '@features': path.resolve(__dirname, '../src/features'),
      '@lib': path.resolve(__dirname, '../src/lib'),
      '@hooks': path.resolve(__dirname, '../src/hooks'),
      '@stores': path.resolve(__dirname, '../src/stores'),
      '@types': path.resolve(__dirname, '../src/types'),
      '@styles': path.resolve(__dirname, '../src/styles'),
    };

    return config;
  },
};

export default config;
