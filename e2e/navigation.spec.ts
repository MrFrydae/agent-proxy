import { test, expect } from "./fixtures/test-fixtures";

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi();
  });

  test("renders all 4 navigation items", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Accounts" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Logs" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("highlights Dashboard as active on /", async ({ page }) => {
    await page.goto("/");
    const dashboardLink = page.locator("nav").getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toHaveClass(/text-primary/);
  });

  test("navigates to /accounts and updates active state", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Accounts" }).click();
    await expect(page).toHaveURL("/accounts");
    const accountsLink = page.locator("nav").getByRole("link", { name: "Accounts" });
    await expect(accountsLink).toHaveClass(/text-primary/);
  });

  test("navigates to /logs and updates active state", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Logs" }).click();
    await expect(page).toHaveURL("/logs");
    const logsLink = page.locator("nav").getByRole("link", { name: "Logs" });
    await expect(logsLink).toHaveClass(/text-primary/);
  });

  test("navigates to /settings and updates active state", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
    const settingsLink = page.locator("nav").getByRole("link", { name: "Settings" });
    await expect(settingsLink).toHaveClass(/text-primary/);
  });

  test("displays app branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Intern Hopper" })).toBeVisible();
    await expect(page.getByText("API Proxy with Failover")).toBeVisible();
    await expect(page.getByText("v1.0.0")).toBeVisible();
  });
});
