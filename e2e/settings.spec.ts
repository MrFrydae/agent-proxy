import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("displays correct header", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Configure your proxy endpoints and preferences")).toBeVisible();
  });

  test("shows Proxy Base URLs with both endpoints", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Proxy Base URLs")).toBeVisible();
    await expect(page.getByText("Anthropic (Claude)")).toBeVisible();
    await expect(page.getByText("OpenAI (Codex)")).toBeVisible();
    await expect(page.locator("code").filter({ hasText: "/api/v1/anthropic" })).toBeVisible();
    await expect(page.locator("code").filter({ hasText: "/api/v1/openai" })).toBeVisible();
  });

  test("copy button copies URL and shows toast", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Clipboard permissions only supported in Chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/settings");

    // Click the first copy button (Anthropic URL)
    const copyButtons = page.getByRole("button").filter({ has: page.locator("svg") });
    await copyButtons.first().click();

    // Verify toast
    await expect(page.getByText("Copied to clipboard")).toBeVisible();

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("/api/v1/anthropic");
  });

  test("shows System Status card", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("System Status")).toBeVisible();
    await expect(page.getByText("Active (AES-256-GCM)")).toBeVisible();
    await expect(page.getByText("codex-flare.db")).toBeVisible();
    await expect(page.getByText("Every ~15s")).toBeVisible();
  });

  test("shows Usage Example with curl command", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Usage Example")).toBeVisible();
    const pre = page.locator("pre");
    await expect(pre).toContainText("curl");
    await expect(pre).toContainText("/api/v1/anthropic/v1/messages");
  });
});
