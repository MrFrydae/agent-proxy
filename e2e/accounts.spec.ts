import { test, expect } from "./fixtures/test-fixtures";
import { createMockAccount } from "./fixtures/mock-data";

test.describe("Accounts Page", () => {
  test.describe("List rendering", () => {
    test("displays empty state when no accounts", async ({ page, mockApi }) => {
      await mockApi({ accounts: [] });
      await page.goto("/accounts");
      await expect(page.getByText("No accounts yet. Add one to get started.")).toBeVisible();
    });

    test("renders accounts grouped by provider", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await expect(page.getByText("Anthropic (Claude)")).toBeVisible();
      await expect(page.getByText("OpenAI (Codex)")).toBeVisible();
    });

    test("displays Active badge on first account in each group", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      // The first account card shows the "Active" badge
      await expect(page.getByText("Claude Primary")).toBeVisible();
      const activeBadges = page.locator("text=Active").filter({ hasNotText: "Active Accounts" });
      await expect(activeBadges.first()).toBeVisible();
    });

    test("shows OAuth badge on OAuth accounts", async ({ page, mockApi }) => {
      await mockApi({
        accounts: [
          createMockAccount({
            id: "acc_oauth",
            label: "OAuth Account",
            authMethod: "oauth",
          }),
        ],
      });
      await page.goto("/accounts");
      // Badge text "OAuth" inside the account card area
      await expect(page.getByText("OAuth", { exact: true })).toBeVisible();
    });

    test("shows Rate Limited badge when applicable", async ({ page, mockApi }) => {
      await mockApi({
        accounts: [
          createMockAccount({
            id: "acc_rl",
            label: "Limited Account",
            rateLimitStatus: "rate_limited",
          }),
        ],
      });
      await page.goto("/accounts");
      await expect(page.getByText("Rate Limited")).toBeVisible();
    });

    test("displays quota progress bars on account cards", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await expect(page.getByText("Usage (5-hour)").first()).toBeVisible();
      await expect(page.getByText("Usage (Weekly)").first()).toBeVisible();
      await expect(page.getByText("45.2%").first()).toBeVisible();
    });
  });

  test.describe("Add Account dialog (API Key)", () => {
    test("opens dialog when Add Account is clicked", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Add Account" }).click();
      await expect(page.getByText("Add API Account")).toBeVisible();
    });

    test("dialog has provider selector with correct options", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Add Account" }).click();
      const select = page.locator("select").first();
      await expect(select).toBeVisible();
      await expect(select.locator("option")).toHaveCount(2);
      await expect(select.locator("option").first()).toHaveText("Anthropic (Claude)");
      await expect(select.locator("option").last()).toHaveText("OpenAI (Codex)");
    });

    test("submits new account via API key", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Add Account" }).click();

      // Fill form
      await page.getByPlaceholder("e.g. Personal, Work, Backup...").fill("My New Account");
      await page.getByPlaceholder("sk-...").fill("sk-test-key-12345");

      // Intercept POST to verify
      const requestPromise = page.waitForRequest(
        (req) => req.url().includes("/api/accounts") && req.method() === "POST"
      );

      await page.locator("[data-slot='dialog-content']").getByRole("button", { name: "Add Account" }).click();

      const request = await requestPromise;
      const body = request.postDataJSON();
      expect(body.label).toBe("My New Account");
      expect(body.apiKey).toBe("sk-test-key-12345");
      expect(body.provider).toBe("anthropic");

      // Toast appears
      await expect(page.getByText("Account added")).toBeVisible();
    });

    test("shows error toast on failed submission", async ({ page, mockApi }) => {
      await mockApi();
      // Override POST to fail
      await page.route("**/api/accounts", async (route, request) => {
        if (request.method() === "POST") {
          await route.fulfill({
            status: 400,
            json: { error: "API key is invalid" },
          });
        } else {
          await route.fulfill({ json: [] });
        }
      });
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Add Account" }).click();
      await page.getByPlaceholder("e.g. Personal, Work, Backup...").fill("Test");
      await page.getByPlaceholder("sk-...").fill("bad-key");
      await page.locator("[data-slot='dialog-content']").getByRole("button", { name: "Add Account" }).click();

      await expect(page.getByText("API key is invalid")).toBeVisible();
    });
  });

  test.describe("Add Account dialog (OAuth)", () => {
    test("switches to OAuth tab", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Add Account" }).click();
      await page.getByRole("button", { name: "OAuth Login" }).click();
      await expect(page.getByText("Sign in with Claude")).toBeVisible();
    });

    test("OAuth sign-in disabled without label", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Add Account" }).click();
      await page.getByRole("button", { name: "OAuth Login" }).click();
      await expect(page.getByRole("button", { name: "Sign in with Claude" })).toBeDisabled();
    });

    test("starts OAuth flow for Anthropic", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Add Account" }).click();
      await page.getByPlaceholder("e.g. Personal, Work, Backup...").fill("OAuth Account");
      await page.getByRole("button", { name: "OAuth Login" }).click();

      // Prevent window.open from actually opening
      await page.evaluate(() => {
        window.open = () => null;
      });

      await page.getByRole("button", { name: /Sign in with Claude/ }).click();

      // Should show the code input
      await expect(page.getByText("Authorization Code")).toBeVisible();
      await expect(page.getByText("Reopen authorization page")).toBeVisible();
    });
  });

  test.describe("Account actions", () => {
    test("opens rename dialog on edit button click", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByTitle("Edit").first().click();
      await expect(page.getByText("Rename Account")).toBeVisible();
      // Input should be pre-filled with current label
      const input = page.locator("[data-slot='dialog-content']").getByRole("textbox");
      await expect(input).toHaveValue("Claude Primary");
    });

    test("renames account successfully", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByTitle("Edit").first().click();

      const input = page.locator("[data-slot='dialog-content']").getByRole("textbox");
      await input.clear();
      await input.fill("New Name");

      const patchPromise = page.waitForRequest(
        (req) => req.url().includes("/api/accounts/acc_1") && req.method() === "PATCH"
      );

      await page.getByRole("button", { name: "Save" }).click();
      const req = await patchPromise;
      expect(req.postDataJSON().label).toBe("New Name");

      await expect(page.getByText("Account renamed")).toBeVisible();
    });

    test("toggles account active state (pause)", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");

      const patchPromise = page.waitForRequest(
        (req) => req.url().includes("/api/accounts/acc_1") && req.method() === "PATCH"
      );

      await page.getByTitle("Pause").first().click();
      const req = await patchPromise;
      expect(req.postDataJSON().isActive).toBe(0);
    });

    test("deletes account after confirmation", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");

      // Accept the confirm dialog
      page.on("dialog", (dialog) => dialog.accept());

      const deletePromise = page.waitForRequest(
        (req) => req.url().includes("/api/accounts/acc_1") && req.method() === "DELETE"
      );

      await page.getByTitle("Delete").first().click();
      await deletePromise;

      await expect(page.getByText("Account deleted")).toBeVisible();
    });

    test("cancels delete when dialog dismissed", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");

      page.on("dialog", (dialog) => dialog.dismiss());

      let deleteCalled = false;
      await page.route(/\/api\/accounts\/acc_1$/, async (route, request) => {
        if (request.method() === "DELETE") {
          deleteCalled = true;
        }
        await route.continue();
      });

      await page.getByTitle("Delete").first().click();
      // Give it a moment to ensure the delete was NOT called
      await page.waitForTimeout(500);
      expect(deleteCalled).toBe(false);
    });

    test("refreshes quota on button click", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");

      const refreshPromise = page.waitForRequest(
        (req) => req.url().includes("/api/quota/") && req.method() === "POST"
      );

      await page.getByTitle("Refresh Quota").first().click();
      await refreshPromise;

      await expect(page.getByText("Quota refreshed")).toBeVisible();
    });
  });

  test.describe("Reorder mode", () => {
    test("shows Reorder button when 2+ accounts in group", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await expect(page.getByRole("button", { name: "Reorder" }).first()).toBeVisible();
    });

    test("hides Reorder button when only 1 account in group", async ({ page, mockApi }) => {
      await mockApi({
        accounts: [
          createMockAccount({ id: "acc_solo", label: "Solo Account", provider: "anthropic" }),
        ],
      });
      await page.goto("/accounts");
      await expect(page.getByRole("button", { name: "Reorder" })).not.toBeVisible();
    });

    test("toggles reorder mode", async ({ page, mockApi }) => {
      await mockApi();
      await page.goto("/accounts");
      await page.getByRole("button", { name: "Reorder" }).first().click();
      // Button text changes to "Done"
      await expect(page.getByRole("button", { name: "Done" })).toBeVisible();

      // Click Done to exit reorder mode
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByRole("button", { name: "Reorder" }).first()).toBeVisible();
    });
  });
});
