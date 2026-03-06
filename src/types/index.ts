export type Provider = "anthropic" | "openai";

export interface Account {
  id: string;
  provider: string;
  label: string;
  apiKey: string;
  priority: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  quotaFiveHrPercent: number | null;
  quotaFiveHrResetsAt: string | null;
  quotaWeeklyPercent: number | null;
  quotaWeeklyResetsAt: string | null;
  quotaLastCheckedAt: string | null;
  rateLimitedUntil: string | null;
  rateLimitStatus: string | null;
}

export interface AccountPublic extends Omit<Account, "apiKey"> {
  apiKeyLast4: string;
}

export interface RequestLog {
  id: string;
  provider: string;
  accountId: string;
  method: string;
  path: string;
  model: string | null;
  statusCode: number;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  isFailover: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface UsageStats {
  totalRequests: number;
  activeAccounts: number;
  failoverEvents: number;
  errorRate: number;
}

export interface QuotaInfo {
  fiveHour: { utilization: number; resetsAt: string | null };
  sevenDay: { utilization: number; resetsAt: string | null };
}
