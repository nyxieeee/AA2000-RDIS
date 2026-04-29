import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import type { Workspace } from '../types';

type ApiError = Error & { status?: number };

interface WorkspaceState {
  workspace: Workspace;
  fetchWorkspace: () => Promise<void>;
  updateWorkspace: (updates: Partial<Workspace>) => Promise<boolean>;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: {
    id: 'ws_01',
    name: 'AA2000 Security And Technology',
    birTin: '',
    birRdo: '',
    vatRegistered: true,
    registeredAddress: '',
    expenseCategories: [],
    companyWebsite: '',
    industry: '',
    fiscalYearEnd: '',
    filingFrequency: '',
    withholdingTaxRate: 0,
    dataRetentionPeriod: '',
    auditLogEnabled: true,
    exportApprovalRequired: true
  },
  fetchWorkspace: async () => {
    try {
      const data = await apiFetch('/workspace');
      set({ workspace: data });
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 404) {
        // Some deployments do not expose /workspace; keep local defaults.
        console.warn('Workspace endpoint not available (404). Using local defaults.');
        return;
      }
      console.error('Failed to fetch workspace:', err);
    }
  },
  updateWorkspace: async (updates) => {
    try {
      await apiFetch('/workspace', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      set((state) => ({ workspace: { ...state.workspace, ...updates } }));
      return true;
    } catch (err) {
      console.error('Failed to update workspace:', err);
      return false;
    }
  },
}));
