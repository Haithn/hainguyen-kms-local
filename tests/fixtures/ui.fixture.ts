import {
  type Locator,
  type Page,
  test as base,
  expect,
} from "@playwright/test";
import Env from "env/env.global";
import { pagesRegistry, PageType } from "page-objects/registry/pages.registry";
import {
  assertionsRegistry,
  AssertionType,
} from "page-objects/registry/assertions.registry";
import { TAGS } from "utils/helpers/tags";
import { timeouts } from "utils/helpers/timeouts";
import { waitForAngularLoad } from "utils/helpers/wait-for-angular";
import { logger } from "utils/helpers/logger";

/**
 * Action methods on a Locator that can trigger AngularJS HTTP requests or
 * digest cycles.  After each of these we wait for Angular to settle.
 */
const ANGULAR_ACTION_METHODS = new Set([
  "click",
  "fill",
  "selectOption",
  "check",
  "uncheck",
  "tap",
  "type",
  "pressSequentially",
  "clear",
  "dragTo",
]);

/**
 * Locator factory methods that return a child Locator — we re-wrap the result
 * so the Angular-wait behaviour propagates through chained calls.
 */
const LOCATOR_FACTORY_METHODS = new Set([
  "locator",
  "filter",
  "first",
  "last",
  "nth",
  "and",
  "or",
  "getByRole",
  "getByText",
  "getByLabel",
  "getByPlaceholder",
  "getByTestId",
  "getByTitle",
  "getByAltText",
]);

/**
 * Patches a Playwright Locator in-place so that every action method
 * automatically calls waitForAngularLoad after it resolves, and every
 * child-locator factory method returns an equally patched child.
 *
 * Why in-place mutation instead of Proxy:
 *   Playwright 1.51+ uses an internal WeakSet/identity check to verify that a
 *   value passed to `expect(locator).toBeEnabled()` etc. is a genuine Locator
 *   instance.  A Proxy wrapping a Locator is a *different* object reference and
 *   fails that check with "toBeEnabled can be only used with Locator object".
 *   Mutating the instance directly (instance properties shadow prototype
 *   methods) preserves object identity while still intercepting every call.
 */
function wrapLocator(locator: Locator, page: Page): Locator {
  // Guard against double-patching the same instance.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((locator as any).__angularWrapped) return locator;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (locator as any).__angularWrapped = true;

  for (const method of ANGULAR_ACTION_METHODS) {
    // Read from the prototype chain (not the instance) to get the real original.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = (Object.getPrototypeOf(locator) as any)[method] as
      | ((...a: unknown[]) => Promise<unknown>)
      | undefined;
    if (typeof original !== "function") continue;

    // Shadow the prototype method on this instance.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (locator as any)[method] = async (...args: unknown[]) => {
      const result = await original.apply(locator, args);
      await waitForAngularLoad(page);
      return result;
    };
  }

  for (const method of LOCATOR_FACTORY_METHODS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = (Object.getPrototypeOf(locator) as any)[method] as
      | ((...a: unknown[]) => Locator)
      | undefined;
    if (typeof original !== "function") continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (locator as any)[method] = (...args: unknown[]) => {
      const child = original.apply(locator, args) as Locator;
      return wrapLocator(child, page);
    };
  }

  return locator;
}

/**
 * Patches page locator-factory methods to return Angular-aware wrapped
 * Locators, and patches direct page action methods (page.click / page.fill /
 * …) to wait for Angular after each call.
 */
function patchPageForAngular(page: Page): void {
  // ── Locator factories ────────────────────────────────────────────────────
  const PAGE_LOCATOR_FACTORIES = [
    "locator",
    "getByRole",
    "getByText",
    "getByLabel",
    "getByPlaceholder",
    "getByTestId",
    "getByTitle",
    "getByAltText",
  ] as const;

  for (const method of PAGE_LOCATOR_FACTORIES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (page as any)[method].bind(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (page as any)[method] = (...args: any[]) =>
      wrapLocator(orig(...args), page);
  }

  // ── Direct page action methods ───────────────────────────────────────────
  const PAGE_ACTION_METHODS = [
    "click",
    "fill",
    "check",
    "uncheck",
    "selectOption",
    "tap",
    "type",
  ] as const;

  for (const method of PAGE_ACTION_METHODS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (page as any)[method].bind(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (page as any)[method] = async (...args: any[]) => {
      const result = await orig(...args);
      await waitForAngularLoad(page);
      return result;
    };
  }
}

export const test = base.extend<{
  testManager: void;
  ui: PageType;
  assertions: AssertionType;
}>({
  testManager: [
    async ({}, use, testInfo) => {
      const tags = testInfo.annotations.map((a) => a.type);
      const isBug = tags.includes(TAGS.BUG);
      const isSlow = tags.includes(TAGS.SLOW);

      // Skip retry if "BUG" title is in title
      test.skip(testInfo.retry > 0 && isBug, "Skipping retry for known bug");

      // Set timeout for tests marked as "SLOW"
      if (isSlow) {
        test.setTimeout(timeouts.FIFTEEN_MINUTES);
      }

      // LOG test start
      logger.info(`Starting test: ${testInfo.title}`);

      await use();

      // Cleanup and report test result
      if (testInfo.status === "failed") {
        logger.warn(`Test failed: ${testInfo.title}, Retry: ${testInfo.retry}`);
      }
      logger.info(`Test completed: ${testInfo.title}`);
    },
    { auto: true },
  ],
  ui: async ({ context, page }, use) => {
    // Bypass OneTrust cookie consent banner
    const domain = new URL(Env.WEB_URL).hostname;
    await context.addCookies([
      {
        name: "OptanonAlertBoxClosed",
        value: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        domain: domain,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
      {
        name: "OptanonConsent",
        value:
          "isGpcEnabled=0&datestamp=Wed+Jan+01+2026+00%3A00%3A00+GMT%2B0000&version=202505.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=test-consent-id&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=1%3A1%2C2%3A1%2C3%3A1%2C4%3A1&intType=1",
        domain: domain,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // Patch page.goto so every full-page navigation automatically waits for
    // the Evolve AngularJS loading panel to disappear and $http to go idle.
    // This covers all page objects that call this.page.goto(...) internally.
    const origGoto = page.goto.bind(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (page as any).goto = async (
      url: string,
      options?: Parameters<typeof page.goto>[1],
    ) => {
      const response = await origGoto(url, options);
      await waitForAngularLoad(page);
      return response;
    };

    // Patch locator factory methods and direct action methods so that every
    // click, fill, selectOption, check, uncheck, etc. automatically waits for
    // Angular to settle — no need to call waitForAngularLoad manually in page
    // objects after each action.
    patchPageForAngular(page);

    await use(pagesRegistry(page));

    // Safety net: explicit teardown (Playwright also does this, so use .catch)
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  },
  assertions: async ({ ui }, use) => {
    await use(assertionsRegistry(ui));
  },
});

export { expect };
