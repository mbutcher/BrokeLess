import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { AccountMappingSection } from './AccountMappingSection';

const BASE = '/api/v1';

const mockMappings = [
  {
    id: '1',
    userId: 'u1',
    simplefinAccountId: 'sf-chq',
    simplefinOrgName: 'TD Canada Trust',
    simplefinAccountName: 'TD Every Day Chequing',
    simplefinAccountType: 'checking',
    localAccountId: 'local-1',
    ignored: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'u1',
    simplefinAccountId: 'sf-sav',
    simplefinOrgName: 'TD Canada Trust',
    simplefinAccountName: 'TD eSavings',
    simplefinAccountType: 'savings',
    localAccountId: null,
    ignored: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    userId: 'u1',
    simplefinAccountId: 'sf-cc',
    simplefinOrgName: 'RBC',
    simplefinAccountName: 'RBC Avion Visa',
    simplefinAccountType: 'credit_card',
    localAccountId: null,
    ignored: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockLocalAccounts = [
  {
    id: 'local-1',
    userId: 'u1',
    name: 'TD Chequing',
    type: 'checking',
    isAsset: true,
    startingBalance: 0,
    currentBalance: 2450.0,
    currency: 'CAD',
    color: null,
    institution: 'TD Canada Trust',
    annualRate: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'local-2',
    userId: 'u1',
    name: 'RBC Visa',
    type: 'credit_card',
    isAsset: false,
    startingBalance: 0,
    currentBalance: -340.5,
    currency: 'CAD',
    color: null,
    institution: 'RBC',
    annualRate: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const handlers = [
  http.get(`${BASE}/simplefin/accounts`, () =>
    HttpResponse.json({ status: 'success', data: { accounts: mockMappings } })
  ),
  http.get(`${BASE}/accounts`, () =>
    HttpResponse.json({ status: 'success', data: { accounts: mockLocalAccounts } })
  ),
  http.post(`${BASE}/simplefin/accounts/:id/map`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),
  http.post(`${BASE}/simplefin/accounts/:id/ignore`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),
];

const meta: Meta<typeof AccountMappingSection> = {
  title: 'Integrations/AccountMappingSection',
  component: AccountMappingSection,
  parameters: {
    msw: { handlers },
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof AccountMappingSection>;

export const MixedState: Story = {};

export const AllLinked: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(`${BASE}/simplefin/accounts`, () =>
          HttpResponse.json({
            status: 'success',
            data: {
              accounts: mockMappings.map((m) => ({
                ...m,
                localAccountId: 'local-1',
                ignored: false,
              })),
            },
          })
        ),
        http.get(`${BASE}/accounts`, () =>
          HttpResponse.json({ status: 'success', data: { accounts: mockLocalAccounts } })
        ),
        http.post(`${BASE}/simplefin/accounts/:id/map`, () =>
          HttpResponse.json({ status: 'success', data: null })
        ),
        http.post(`${BASE}/simplefin/accounts/:id/ignore`, () =>
          HttpResponse.json({ status: 'success', data: null })
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(`${BASE}/simplefin/accounts`, () =>
          HttpResponse.json({ status: 'success', data: { accounts: [] } })
        ),
        http.get(`${BASE}/accounts`, () =>
          HttpResponse.json({ status: 'success', data: { accounts: [] } })
        ),
      ],
    },
  },
};
