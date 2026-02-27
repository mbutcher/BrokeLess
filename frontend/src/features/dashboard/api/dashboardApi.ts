import { apiClient } from '@lib/api/client';
import type { DashboardConfig, DashboardHint } from '../types/dashboard';

interface ConfigResponse {
  status: 'success';
  data: { config: DashboardConfig };
}

interface HintsResponse {
  status: 'success';
  data: { hints: DashboardHint[] };
}

export async function fetchDashboardConfig(): Promise<DashboardConfig> {
  const res = await apiClient.get<ConfigResponse>('/dashboard/config');
  return res.data.data.config;
}

export async function putDashboardConfig(config: DashboardConfig): Promise<DashboardConfig> {
  const res = await apiClient.put<ConfigResponse>('/dashboard/config', config);
  return res.data.data.config;
}

export async function fetchDashboardHints(): Promise<DashboardHint[]> {
  const res = await apiClient.get<HintsResponse>('/dashboard/hints');
  return res.data.data.hints;
}
