import { api } from './client';
import type {
  TransferPayload,
  TransferResult,
  AuditResult,
  StatementExportPayload,
  StatementExportRequestResult,
  StatementJobStatusResponse,
} from '../types';

export const walletApi = {
  async transfer(
    payload: TransferPayload,
    idempotencyKey: string
  ): Promise<TransferResult> {
    return api.post<TransferResult>('/wallets/transfer', payload, {
      headers: {
        'X-Idempotency-Key': idempotencyKey,
      },
    });
  },

  async auditWallet(walletId: string): Promise<AuditResult> {
    return api.get<AuditResult>(`/wallets/${walletId}/audit`);
  },

  async requestStatementExport(
    walletId: string,
    payload: StatementExportPayload
  ): Promise<StatementExportRequestResult> {
    return api.post<StatementExportRequestResult>(
      `/wallets/${walletId}/statements/export`,
      payload
    );
  },

  async getStatementJobStatus(jobId: string): Promise<StatementJobStatusResponse> {
    return api.get<StatementJobStatusResponse>(
      `/wallets/statements/jobs/${jobId}`
    );
  },
};
