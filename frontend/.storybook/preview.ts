import type { Preview, Decorator } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import i18n from '@lib/i18n';
import '@styles/globals.css';

/** Wrap every story in a fresh QueryClient (no retries, data never goes stale). */
const withQueryClient: Decorator = (Story) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(Story)
  );
};

/** Wrap every story in MemoryRouter so components that call useNavigate/useLocation don't crash. */
const withRouter: Decorator = (Story) =>
  React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(Story));

/** Wrap every story in I18nextProvider so useTranslation() returns real en-CA strings. */
const withI18n: Decorator = (Story) =>
  React.createElement(I18nextProvider, { i18n }, React.createElement(Story));

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: {
        Default: 'default',
        Slate: 'slate',
        Forest: 'forest',
        Warm: 'warm',
        Midnight: 'midnight',
      },
      defaultTheme: 'Default',
      attributeName: 'data-theme',
    }),
    withQueryClient,
    withRouter,
    withI18n,
  ],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '390px', height: '844px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
      },
      defaultViewport: 'desktop',
    },
  },
};

export default preview;
