import { test, expect } from "./fixtures/test-fixtures";

test.describe("Dashboard Page", () => {
  test("displays correct header", async ({ page, mockApi }) => {
    await mockApi();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Overview of your proxy activity and quotas")).toBeVisible();
  });

  test("renders 4 stat cards with correct values", async ({ page, mockApi }) => {
    await mockApi();
    await page.goto("/");

    await expect(page.getByText("Requests Today")).toBeVisible();
    // toLocaleString() formats 1247 as "1,247"
    await expect(page.getByText("1,247")).toBeVisible();

    await expect(page.getByText("Active Accounts")).toBeVisible();
    // Find the card containing "Active Accounts" and verify it has the value "3"
    const activeAccountsCard = page.locator("[data-slot='card']").filter({ hasText: "Active Accounts" });
    await expect(activeAccountsCard.locator(".text-2xl")).toHaveText("3");

    await expect(page.getByText("Failover Events")).toBeVisible();

    await expect(page.getByText("Error Rate")).toBeVisible();
    // Use exact match to avoid matching "22.1%" from quota gauges
    const errorRateCard = page.locator("[data-slot='card']").filter({ hasText: "Error Rate" });
    await expect(errorRateCard.locator(".text-2xl")).toHaveText("2.1%");
  });

  test("renders quota gauges when quota data exists", async ({ page, mockApi }) => {
    await mockApi();
    await page.goto("/");
    await expect(page.getByText("Quota Usage")).toBeVisible();
    await expect(page.getByText("Primary Claude")).toBeVisible();
    await expect(page.getByText("45.2%")).toBeVisible();
    await expect(page.getByText("22.1%")).toBeVisible();
  });

  test("hides quota gauges when no accounts have quota", async ({ page, mockApi }) => {
    await mockApi();
    // Override quota route to return empty array
    await page.route("**/api/quota", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.goto("/");
    await expect(page.getByText("Quota Usage")).not.toBeVisible();
  });

  test("renders usage chart", async ({ page, mockApi }) => {
    await mockApi();
    await page.goto("/");
    await expect(page.getByText("Requests (Last 7 Days)")).toBeVisible();
    // Recharts renders SVGs
    await expect(page.locator(".recharts-responsive-container")).toBeVisible();
  });

  test("shows 'No data yet' when chart has no data", async ({ page, mockApi }) => {
    await mockApi();
    await page.route("**/api/usage*", async (route) => {
      await route.fulfill({
        json: {
          stats: { totalRequests: 0, activeAccounts: 0, failoverEvents: 0, errorRate: 0 },
          dailyStats: [],
        },
      });
    });
    await page.goto("/");
    await expect(page.getByText("No data yet")).toBeVisible();
  });

  test("renders recent activity with log entries", async ({ page, mockApi }) => {
    await mockApi();
    await page.goto("/");
    await expect(page.getByText("Recent Activity")).toBeVisible();
    await expect(page.getByText("/v1/messages").first()).toBeVisible();
  });

  test("shows 'No requests yet' for empty activity", async ({ page, mockApi }) => {
    await mockApi({ logs: [] });
    // Also override the logs endpoint for dashboard's limit=10 fetch
    await page.route("**/api/logs*", async (route) => {
      await route.fulfill({ json: { data: [], total: 0, page: 1, limit: 50 } });
    });
    await page.goto("/");
    await expect(page.getByText("No requests yet")).toBeVisible();
  });
});
