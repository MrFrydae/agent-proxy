import type { Page } from "@playwright/test";
import {
  createMockAccount,
  createMockLog,
  createMockUsageResponse,
  createMockQuotaAccounts,
} from "../fixtures/mock-data";
import type { AccountPublic, RequestLog } from "../../src/types";

interface MockApiOptions {
  accounts?: AccountPublic[];
  logs?: RequestLog[];
  logTotal?: number;
  usage?: ReturnType<typeof createMockUsageResponse>;
  quota?: ReturnType<typeof createMockQuotaAccounts>;
}

export async function setupApiMocks(page: Page, options: MockApiOptions = {}) {
  const {
    accounts = [
      createMockAccount({
        id: "acc_1",
        label: "Claude Primary",
        provider: "anthropic",
        priority: 1,
      }),
      createMockAccount({
        id: "acc_2",
        label: "Claude Backup",
        provider: "anthropic",
        priority: 2,
      }),
      createMockAccount({
        id: "acc_3",
        label: "OpenAI Main",
        provider: "openai",
        priority: 1,
        apiKeyLast4: "o456",
      }),
    ],
    logs = Array.from({ length: 10 }, (_, i) =>
      createMockLog({
        id: `log_${i}`,
        statusCode: i === 3 ? 429 : 200,
        isFailover: i === 4 ? 1 : 0,
        provider: i % 2 === 0 ? "anthropic" : "openai",
        latencyMs: 200 + i * 50,
      })
    ),
    logTotal = 120,
    usage = createMockUsageResponse(),
    quota = createMockQuotaAccounts(),
  } = options;

  // GET/POST /api/accounts
  await page.route("**/api/accounts", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({ json: accounts });
    } else if (request.method() === "POST") {
      const body = request.postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          id: "acc_new",
          provider: body.provider,
          label: body.label,
          priority: accounts.length + 1,
        },
      });
    } else {
      await route.continue();
    }
  });

  // POST /api/accounts/reorder (must be before the wildcard)
  await page.route("**/api/accounts/reorder", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  // PATCH/DELETE /api/accounts/[id]
  await page.route(/\/api\/accounts\/(?!reorder)[^/]+$/, async (route, request) => {
    if (request.method() === "PATCH") {
      await route.fulfill({ json: { ok: true } });
    } else if (request.method() === "DELETE") {
      await route.fulfill({ json: { ok: true } });
    } else {
      await route.continue();
    }
  });

  // GET /api/logs
  await page.route("**/api/logs*", async (route, request) => {
    const url = new URL(request.url());
    const providerFilter = url.searchParams.get("provider");
    const filteredLogs = providerFilter
      ? logs.filter((log) => log.provider === providerFilter)
      : logs;
    await route.fulfill({
      json: {
        data: filteredLogs,
        total: providerFilter ? filteredLogs.length : logTotal,
        page: Number(url.searchParams.get("page") || 1),
        limit: Number(url.searchParams.get("limit") || 50),
      },
    });
  });

  // GET /api/usage
  await page.route("**/api/usage*", async (route) => {
    await route.fulfill({ json: usage });
  });

  // GET /api/quota
  await page.route("**/api/quota", async (route) => {
    await route.fulfill({ json: quota });
  });

  // POST /api/quota/[id]/refresh
  await page.route("**/api/quota/*/refresh", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  // OAuth routes
  await page.route("**/api/oauth/authorize", async (route) => {
    await route.fulfill({
      json: {
        authUrl: "https://example.com/oauth/authorize?mock=true",
        state: "mock-state-123",
        externalRedirect: true,
      },
    });
  });

  await page.route("**/api/oauth/exchange", async (route) => {
    await route.fulfill({ status: 201, json: { ok: true } });
  });
}
