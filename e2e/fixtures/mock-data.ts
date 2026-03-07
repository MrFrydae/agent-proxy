import type { AccountPublic, RequestLog } from "../../src/types";

export function createMockAccount(
  overrides: Partial<AccountPublic> = {}
): AccountPublic {
  return {
    id: "acc_test_001",
    provider: "anthropic",
    label: "Test Account",
    priority: 1,
    isActive: 1,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    quotaFiveHrPercent: 45.2,
    quotaFiveHrResetsAt: new Date(Date.now() + 3600000).toISOString(),
    quotaWeeklyPercent: 22.1,
    quotaWeeklyResetsAt: new Date(Date.now() + 86400000).toISOString(),
    quotaLastCheckedAt: new Date().toISOString(),
    rateLimitedUntil: null,
    rateLimitStatus: null,
    authMethod: "api_key",
    accessTokenExpiresAt: null,
    oauthScopes: null,
    apiKeyLast4: "k123",
    ...overrides,
  };
}

export function createMockLog(
  overrides: Partial<RequestLog> = {}
): RequestLog {
  return {
    id: "log_001",
    provider: "anthropic",
    accountId: "acc_test_001",
    method: "POST",
    path: "/v1/messages",
    model: "claude-sonnet-4-20250514",
    statusCode: 200,
    inputTokens: 150,
    outputTokens: 500,
    latencyMs: 342,
    isFailover: 0,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockUsageResponse() {
  return {
    stats: {
      totalRequests: 1247,
      activeAccounts: 3,
      failoverEvents: 12,
      errorRate: 2.1,
    },
    dailyStats: [
      { date: "2025-02-28", count: 180, tokens: 45000 },
      { date: "2025-03-01", count: 210, tokens: 52000 },
      { date: "2025-03-02", count: 195, tokens: 48000 },
      { date: "2025-03-03", count: 225, tokens: 55000 },
      { date: "2025-03-04", count: 190, tokens: 47000 },
      { date: "2025-03-05", count: 205, tokens: 51000 },
      { date: "2025-03-06", count: 242, tokens: 60000 },
    ],
  };
}

export function createMockQuotaAccounts() {
  return [
    {
      id: "acc_test_001",
      provider: "anthropic",
      label: "Primary Claude",
      priority: 1,
      isActive: 1,
      quotaFiveHrPercent: 45.2,
      quotaFiveHrResetsAt: new Date(Date.now() + 3600000).toISOString(),
      quotaWeeklyPercent: 22.1,
      quotaWeeklyResetsAt: new Date(Date.now() + 86400000).toISOString(),
      quotaLastCheckedAt: new Date().toISOString(),
      rateLimitedUntil: null,
      rateLimitStatus: null,
    },
  ];
}
