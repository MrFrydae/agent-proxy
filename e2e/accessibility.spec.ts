import { test, expect } from "./fixtures/test-fixtures";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi();
  });

  test("all pages have correct document title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Intern Hopper");

    await page.goto("/accounts");
    await expect(page).toHaveTitle("Intern Hopper");

    await page.goto("/logs");
    await expect(page).toHaveTitle("Intern Hopper");

    await page.goto("/settings");
    await expect(page).toHaveTitle("Intern Hopper");
  });

  test("sidebar navigation items are accessible links", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("nav").getByRole("link");
    await expect(links).toHaveCount(4);
  });

  test("dialog has correct ARIA role", async ({ page }) => {
    await page.goto("/accounts");
    await page.getByRole("button", { name: "Add Account" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Add API Account")).toBeVisible();
  });

  test("log table has proper semantic structure", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("thead")).toBeVisible();
    await expect(page.locator("tbody")).toBeVisible();
    const headers = page.locator("th");
    await expect(headers).toHaveCount(8);
  });
});
