import { test as base } from "@playwright/test";
import { setupApiMocks } from "../helpers/api-mocks";
import type { AccountPublic, RequestLog } from "../../src/types";

type MockOptions = {
  accounts?: AccountPublic[];
  logs?: RequestLog[];
  logTotal?: number;
};

export const test = base.extend<{
  mockApi: (options?: MockOptions) => Promise<void>;
}>({
  mockApi: async ({ page }, use) => {
    const setup = async (options?: MockOptions) => {
      await setupApiMocks(page, options);
    };
    await use(setup);
  },
});

export { expect } from "@playwright/test";
