import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(), // "anthropic" | "openai"
  label: text("label").notNull(),
  apiKey: text("api_key").notNull(), // AES-256-GCM encrypted
  priority: integer("priority").notNull().default(1),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  // Quota fields
  quotaFiveHrPercent: real("quota_five_hr_percent"),
  quotaFiveHrResetsAt: text("quota_five_hr_resets_at"),
  quotaWeeklyPercent: real("quota_weekly_percent"),
  quotaWeeklyResetsAt: text("quota_weekly_resets_at"),
  quotaLastCheckedAt: text("quota_last_checked_at"),
  rateLimitedUntil: text("rate_limited_until"),
  rateLimitStatus: text("rate_limit_status"),
  // OAuth fields
  authMethod: text("auth_method").notNull().default("api_key"), // "api_key" | "oauth"
  refreshToken: text("refresh_token"), // AES-256-GCM encrypted
  accessTokenExpiresAt: text("access_token_expires_at"),
  oauthScopes: text("oauth_scopes"),
});

export const requestLogs = sqliteTable("request_logs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  accountId: text("account_id").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  model: text("model"),
  statusCode: integer("status_code").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms").notNull(),
  isFailover: integer("is_failover").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});
