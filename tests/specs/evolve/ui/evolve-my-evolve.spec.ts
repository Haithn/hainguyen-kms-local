import Env from "env/env.global";
import { expect, test as base } from "tests/fixtures/merged.fixture";
import { meta, TAGS } from "utils/helpers/tags";
import { timeouts } from "utils/helpers/timeouts";
import {
  USER_STORAGE_KEYS,
  DYNAMIC_USER_KEY_PREFIXES,
  REMOVABLE_USER_KEYS,
  REMAINING_SYSTEM_KEYS,
} from "utils/constants/local-storage-keys";
import {
  getLocalStorageSnapshot,
  verifyKeysRemoved,
  verifyKeysRemaining,
  detectUnexpectedChanges,
} from "utils/helpers/local-storage";

const FACULTY_SYSTEM_ADMIN_USERNAME = "fmanualh460";
const CAMPUSPACK_ADMIN_PORTAL_URL =
  "https://evolvetestlms.elsevier.com/Administration";
const REFERENCE_SELF_ENROLL_STUDENT_USERNAME = Env.EXISTING_STUDENT_EMAIL;
const REFERENCE_SELF_ENROLL_STUDENT_PASSWORD = Env.COMMON_PASSWORD;
const REFERENCE_SELF_ENROLL_COURSE_ID = "189890_jfacultymanual_hsm0001";

const test = base.extend<{ authenticatedAtMyEvolve: void }>({
  authenticatedAtMyEvolve: async ({ ui }, use) => {
    await ui.evolve.LoginPage.goToEvolveLoginPage();
    await ui.evolve.LoginPage.login(
      Env.EXISTING_STUDENT_EMAIL,
      Env.COMMON_PASSWORD,
    );
    await ui.evolve.MyEvolvePage.goToMyEvolvePage();

    await use();
  },
});

test.describe("My Evolve Session Flow", () => {
  test(
    "reference self-enroll flow: redeem valid course id then verify enrolled popup and course id in My Evolve",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.MY_EVOLVE,
        TAGS.REGRESSION,
        TAGS.SELF_ENROLL,
      ],
    }),
    async ({ ui, page }) => {
      test.setTimeout(timeouts.FIVE_MINUTES);

      const loginPage = ui.evolve.LoginPage;
      const myEvolvePage = ui.evolve.MyEvolvePage;

      await test.step(
        "Step 1: Navigate to /cs/ and click I'm a Student",
        async () => {
          await loginPage.goToEvolveHomePage();
          await loginPage.clickStudentButton();
        },
      );

      await test.step(
        "Step 2: Enter course ID and click Redeem",
        async () => {
          await loginPage.redeemCourseId(REFERENCE_SELF_ENROLL_COURSE_ID);
        },
      );

      await test.step(
        "Step 3: On login-required gate, click Login with password",
        async () => {
          await expect(loginPage.elements.loginRequiredMessage()).toBeVisible();

          // If a Pendo popup is displayed, press Escape to close it first
          const isPendoVisible = await loginPage.elements
            .pendoTextContainer()
            .isVisible()
            .catch(() => false);
          if (isPendoVisible) {
            await page.keyboard.press("Escape");
          }

          await loginPage.dismissPendoGuideIfPresent();
          await loginPage.clickLoginWithPasswordFromGate();
          await expect
            .poll(
              () => loginPage.elements.emailInput().isVisible().catch(() => false),
              { timeout: 15000 },
            )
            .toBeTruthy();
        },
      );

      await test.step(
        "Step 4: Sign in with reference student account",
        async () => {
          await expect(loginPage.elements.emailInput()).toBeVisible({ timeout: 15000 });
          await loginPage.fillEmail(REFERENCE_SELF_ENROLL_STUDENT_USERNAME);
          await loginPage.fillPassword(REFERENCE_SELF_ENROLL_STUDENT_PASSWORD);
          await loginPage.clickSignIn();

          await expect
            .poll(() => myEvolvePage.currentUrl(), { timeout: 30000 })
            .toMatch(/\/cs\/(myEvolve|store)/);
        },
      );

      await test.step(
        "Step 5: Verify You're Enrolled popup appears and click Continue",
        async () => {
          await expect(myEvolvePage.elements.enrolledSuccessDialog()).toBeVisible();
          await myEvolvePage.clickContinueOnEnrolledDialog();
          await expect
            .poll(() => myEvolvePage.currentUrl(), { timeout: 15000 })
            .toContain("/cs/myEvolve");
        },
      );

      await test.step(
        "Step 6: Verify newly enrolled course id appears in My Evolve list",
        async () => {
          await expect(
            myEvolvePage.courseIdInMyEvolve(REFERENCE_SELF_ENROLL_COURSE_ID),
          ).toBeVisible();
        },
      );
    },
  );

  test(
    "shows Administration Portal for System Administrator and opens CampusPack admin page in a new tab",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.MY_EVOLVE,
        TAGS.REGRESSION,
        TAGS.MVP_EVOLVE_CORE,
        TAGS.FACULTY,
      ],
      jira: ["EDQAENG-28896"],
    }),
    async ({ ui, page }) => {
      const loginPage = ui.evolve.LoginPage;
      const myEvolvePage = ui.evolve.MyEvolvePage;

      await test.step(
        "Precondition: Login to /cs/ as System Administrator faculty user",
        async () => {
          await loginPage.goToEvolveHomePage();
          await loginPage.clickHeaderSignIn();
          await loginPage.login(
            FACULTY_SYSTEM_ADMIN_USERNAME,
            Env.COMMON_PASSWORD,
          );
        },
      );

      await test.step(
        "Step 1: Click Account button and verify Administration Portal option is displayed",
        async () => {
          await myEvolvePage.openAccountMenu();
          await expect(
            myEvolvePage.elements.administrationPortalOption(),
          ).toBeVisible();
        },
      );

      await test.step(
        "Step 2: Click Administration Portal and verify user is directed to CampusPack URL in a new tab",
        async () => {
          const adminPortalTabPromise = page.context().waitForEvent("page");
          await myEvolvePage.clickAdministrationPortal();

          const adminPortalTab = await adminPortalTabPromise;
          await adminPortalTab.waitForLoadState("domcontentloaded");

          await expect
            .poll(() => adminPortalTab.url())
            .toContain(CAMPUSPACK_ADMIN_PORTAL_URL);
        },
      );
    },
  );

  test(
    "redirects a logged-out student away from My Evolve and removes account access options",
    meta({
      tags: [TAGS.EVOLVE, TAGS.MY_EVOLVE, TAGS.REGRESSION],
      jira: ["EDQAENG-25918"],
    }),
    async ({ ui, assertions, authenticatedAtMyEvolve }) => {
      authenticatedAtMyEvolve;

      const myEvolvePage = ui.evolve.MyEvolvePage;
      const myEvolveAssertion = assertions.evolve.MyEvolveAssertion;

      await test.step(
        "Precondition 1: User is on My Evolve and can see previous content",
        async () => {
          await myEvolveAssertion.verifyAuthenticatedMyEvolveState();
        },
      );

      await test.step(
        "Precondition 2: Account menu shows Account Settings and Order History before logout",
        async () => {
          await myEvolveAssertion.verifyAccountMenuOptionsVisible();
        },
      );

      const previousUrl = await myEvolvePage.currentUrl();

      await test.step(
        "Step 1: Click Account then Logout → verify redirect to Home Page and previous content is no longer visible",
        async () => {
          await myEvolvePage.logout();
          await myEvolveAssertion.verifyRedirectedOutOfProtectedArea(
            previousUrl,
            "student",
          );
        },
      );

      await test.step(
        "Step 2: Look for Account button in header → verify it is no longer available",
        async () => {
          await myEvolveAssertion.verifyRedirectedOutOfProtectedArea(
            previousUrl,
            "student",
          );
        },
      );

      await test.step(
        "Step 3: Look for Account Settings option → verify it is no longer available",
        async () => {
          await myEvolveAssertion.verifyAccountSettingsUnavailable();
        },
      );

      await test.step(
        "Step 4: Look for Order History option → verify it is no longer available",
        async () => {
          await myEvolveAssertion.verifyOrderHistoryUnavailable();
        },
      );
    },
  );

  test(
    "removes user-related local storage keys after logout and keeps the expected system keys",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.MY_EVOLVE,
        TAGS.REGRESSION,
        TAGS.FIELD_VALIDATION,
        TAGS.CREATE_ACCOUNT,
        TAGS.MVP_EVOLVE_CORE,
      ],
      jira: ["EDQAENG-25916"],
    }),
    async ({ ui, page, authenticatedAtMyEvolve }) => {
      authenticatedAtMyEvolve;

      const myEvolvePage = ui.evolve.MyEvolvePage;
      let localStorageKeysToRemove: string[] = [];
      let snapshotBeforeLogout: Record<string, string> = {};
      let snapshotAfterLogout: Record<string, string> = {};
      const baselineRemainingValues = new Map<string, string | null>();

      await test.step(
        "Precondition: Logged-in user is on My Evolve and local storage contains user data",
        async () => {
          snapshotBeforeLogout = await getLocalStorageSnapshot(page);

          const userId = snapshotBeforeLogout[USER_STORAGE_KEYS.USER_ID] ?? null;
          const username = snapshotBeforeLogout[USER_STORAGE_KEYS.USERNAME] ?? null;

          expect(userId).toBeTruthy();
          expect(username).toBeTruthy();

          const removablePrefixMatchers = Object.values(DYNAMIC_USER_KEY_PREFIXES);
          const dynamicUserKeys = Object.keys(snapshotBeforeLogout).filter((key) =>
            removablePrefixMatchers.some((prefix) => key.startsWith(prefix)),
          );

          localStorageKeysToRemove = [
            ...new Set([...REMOVABLE_USER_KEYS, ...dynamicUserKeys]),
          ].filter(
            // Pendo can re-create guide keys asynchronously after logout.
            (key) => !key.startsWith("_pendo_") && !key.startsWith("pendo_"),
          );

          for (const key of REMAINING_SYSTEM_KEYS) {
            const value = snapshotBeforeLogout[key] ?? null;
            baselineRemainingValues.set(key, value);
          }

          await test.info().attach("edqaeng-25916-local-storage-snapshot-before", {
            body: JSON.stringify(
              {
                removableKeys: localStorageKeysToRemove,
                remainingKeys: REMAINING_SYSTEM_KEYS,
                baselineRemainingValues: Object.fromEntries(baselineRemainingValues),
                fullSnapshot: snapshotBeforeLogout,
              },
              null,
              2,
            ),
            contentType: "application/json",
          });
        },
      );

      await test.step(
        "Step 1: Logout then verify user-related local storage keys are removed",
        async () => {
          await myEvolvePage.logout();

          snapshotAfterLogout = await getLocalStorageSnapshot(page);

          verifyKeysRemoved(
            snapshotAfterLogout,
            localStorageKeysToRemove,
          );
        },
      );

      await test.step(
        "Step 2: Verify expected non-user local storage keys remain available after logout",
        async () => {
          verifyKeysRemaining(
            snapshotAfterLogout,
            REMAINING_SYSTEM_KEYS,
            baselineRemainingValues,
          );
        },
      );

      await test.step(
        "Step 3: Verify no unexpected localStorage changes after logout",
        async () => {
          const {
            unexpectedNew,
            unexpectedRemoved,
            unexpectedValueChanged,
          } = detectUnexpectedChanges(
            snapshotBeforeLogout,
            snapshotAfterLogout,
            localStorageKeysToRemove,
            REMAINING_SYSTEM_KEYS,
            {
              // Analytics/guide keys can appear/disappear independently from logout behavior.
              ignoreKeyPrefixes: ["_pendo_", "pendo_", "_ga", "gtm."],
            },
          );

          expect(unexpectedNew).toHaveLength(0);
          expect(unexpectedRemoved).toHaveLength(0);
          expect(unexpectedValueChanged).toHaveLength(0);

          await test.info().attach("edqaeng-25916-local-storage-snapshot-after", {
            body: JSON.stringify(
              {
                fullSnapshot: snapshotAfterLogout,
                unexpectedChanges: {
                  unexpectedNew,
                  unexpectedRemoved,
                  unexpectedValueChanged,
                },
              },
              null,
              2,
            ),
            contentType: "application/json",
          });
        },
      );
    },
  );
});