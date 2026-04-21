import { env } from '@/config/env';
import { apiClient } from '@/services/apiClient';
import type { SqlServerConnections } from '@/features/dashboard/types';

export const dashboardWsUrl = `${env.wsBaseUrl}/sqlserver-dashboard/ws`;

export const dashboardApi = {
  getConnections: async (): Promise<SqlServerConnections> => {
    const { data } = await apiClient.get<SqlServerConnections>('/sqlserver-dashboard/connections');
    return data;
  },
};
