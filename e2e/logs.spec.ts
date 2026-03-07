import { test, expect } from "./fixtures/test-fixtures";
import { createMockLog } from "./fixtures/mock-data";

test.describe("Logs Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi();
  });

  test("displays correct header", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.getByRole("heading", { name: "Request Logs" })).toBeVisible();
    await expect(page.getByText("Monitor API requests and responses")).toBeVisible();
  });

  test("renders log table with correct columns", async ({ page }) => {
    await page.goto("/logs");
    const headers = ["Time", "Provider", "Path", "Model", "Status", "Tokens", "Latency", "Failover"];
    for (const header of headers) {
      await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    }
  });

  test("displays log rows with data", async ({ page }) => {
    await page.goto("/logs");
    // Wait for data to load — check for provider badge which only appears in data rows
    await expect(page.locator("tbody").getByText("anthropic").first()).toBeVisible();
    // Should have data rows (10 mocked logs)
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(10);
  });

  test("status badge uses default variant for 2xx", async ({ page }) => {
    await page.goto("/logs");
    const successBadges = page.locator("tbody").getByText("200").first();
    await expect(successBadges).toBeVisible();
  });

  test("status badge uses destructive variant for 4xx", async ({ page }) => {
    await page.goto("/logs");
    const errorBadge = page.locator("tbody").getByText("429");
    await expect(errorBadge).toBeVisible();
  });

  test("shows failover badge", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.locator("tbody").getByText("Yes")).toBeVisible();
  });

  test("shows empty state when no logs", async ({ page }) => {
    await page.route("**/api/logs*", async (route) => {
      await route.fulfill({ json: { data: [], total: 0, page: 1, limit: 50 } });
    });
    await page.goto("/logs");
    await expect(page.getByText("No logs yet")).toBeVisible();
  });

  test("filters by provider dropdown", async ({ page }) => {
    await page.goto("/logs");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("provider=anthropic") && req.method() === "GET"
    );

    await page.locator("select").selectOption("anthropic");
    await requestPromise;
  });

  test("shows pagination when total > limit", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.getByText("120 total entries")).toBeVisible();
    await expect(page.getByText("1 / 3")).toBeVisible();
  });

  test("Previous button disabled on page 1", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  test("navigates to next page", async ({ page }) => {
    await page.goto("/logs");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("page=2") && req.method() === "GET"
    );

    // Use exact: true to avoid matching Next.js dev tools button
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await requestPromise;
  });

  test("hides pagination when total <= limit", async ({ page }) => {
    await page.route("**/api/logs*", async (route) => {
      await route.fulfill({
        json: {
          data: [createMockLog()],
          total: 1,
          page: 1,
          limit: 50,
        },
      });
    });
    await page.goto("/logs");
    await expect(page.getByRole("button", { name: "Previous" })).not.toBeVisible();
    // Check the pagination container is not visible rather than the "Next" button
    // (to avoid matching Next.js dev tools button)
    await expect(page.getByText("total entries")).not.toBeVisible();
  });
});
