import { type Page } from "@playwright/test";
import timeouts from "./timeouts";

/**
 * Waits for the Evolve AngularJS application to finish loading after a
 * page navigation or SPA route change.
 *
 * How the loading panel works:
 *   - The `angular-loading-bar` library intercepts every `$http` request.
 *   - On the first in-flight request it fires `cfpLoadingBar:loading`, which
 *     causes `elsLayerService` to append an `<els-page-loader>` element
 *     (CSS class `.c-els-page-loader`) into the DOM.
 *   - Once all requests complete it fires `cfpLoadingBar:completed`, which
 *     removes the element after a 500 ms timeout.
 *
 * This function therefore:
 *   1. Waits for `<els-page-loader>` to be detached from the DOM.
 *   2. Waits for Angular's `$http.pendingRequests` to reach zero.
 *   3. Waits for Angular's `$digest` cycle to be idle (`$$phase === null`).
 *
 * All three steps have independent timeouts so one failure never silently
 * blocks the others.
 */
export async function waitForAngularLoad(page: Page): Promise<void> {
  const timeout = timeouts.THIRTY_SECONDS;

  // ── Step 1: loading panel ────────────────────────────────────────────────
  // The panel may never appear (page was already loaded or no HTTP calls were
  // made), so the waitFor is wrapped in a catch to avoid test failures.
  await page
    .locator("els-page-loader")
    .waitFor({ state: "detached", timeout })
    .catch(() => {
      // Panel never appeared or timed out — continue to Angular stability check.
    });

  // ── Step 2 & 3: Angular $http + $digest idle ─────────────────────────────
  await page
    .waitForFunction(
      () => {
        const win = window as any;
        const ng = win.angular;

        // Not an AngularJS page (e.g. redirected to an external IdP).
        if (!ng) return true;

        try {
          const rootEl = ng.element(document.querySelector("[ng-app]"));
          const injector = rootEl?.injector?.();

          // Angular hasn't bootstrapped yet — keep waiting.
          if (!injector) return false;

          const $http = injector.get("$http");
          const $rootScope = injector.get("$rootScope");

          const httpIdle: boolean = $http.pendingRequests.length === 0;
          const digestIdle: boolean = !$rootScope.$$phase;

          return httpIdle && digestIdle;
        } catch {
          // Angular injector not reachable — don't block the test.
          return true;
        }
      },
      { timeout },
    )
    .catch(() => {
      // Angular didn't settle within the timeout — proceed anyway so tests
      // fail with a meaningful assertion error rather than a timeout here.
    });
}
