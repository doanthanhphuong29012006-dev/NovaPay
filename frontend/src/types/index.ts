export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  hasSetupPin?: boolean;
}

export type WalletStatus = 'ACTIVE' | 'FROZEN';

export interface Wallet {
  _id: string;
  userId: string;
  currency: string;
  balance: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
  // UI helper fields
  customName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResult {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  wallet: {
    id: string;
    currency: string;
    balance: number;
  };
}

export interface UserProfileResponse extends User {
  wallets: Wallet[];
}

export interface TransferPayload {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description: string;
  pin: string;
}

export interface TransferResult {
  transactionId: string;
  amount: number;
  currency: string;
  senderBalanceAfter: number;
  createdAt: string;
}

export interface AuditResult {
  walletId: string;
  currentBalance: number;
  ledgerCalculatedBalance: number;
  discrepancy: number;
  status: string; // 'MATCHED (Toàn vẹn dữ liệu)' | 'MISMATCHED (Phát hiện sai lệch!)'
}

export interface StatementExportPayload {
  userEmail: string;
  fromDate: string; // ISO 8601
  toDate: string;   // ISO 8601
}

export interface StatementExportRequestResult {
  jobId: string;
  status: string;
  message: string;
}

export interface StatementJobResultDetails {
  filename: string;
  filePath?: string; // Note: hidden from users as per security guidelines
  totalRecords: number;
  totalCredit: number;
  totalDebit: number;
  completedAt: string;
}

export interface StatementJobStatusResponse {
  jobId: string;
  state: 'queued' | 'active' | 'waiting' | 'delayed' | 'completed' | 'failed' | string;
  progress: number;
  result: StatementJobResultDetails | null;
  faildReason: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  isConflict?: boolean;
  isInsufficientBalance?: boolean;
  isUnauthorized?: boolean;
}
