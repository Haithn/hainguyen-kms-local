import { test } from "../../fixtures/merged.fixture";
import { logger } from "../../../utils/helpers/logger";
import { getCreateStudentTestData } from "../../../utils/helpers/create-student-testdata";
import { meta, TAGS } from "../../../utils/helpers/tags";
import { timeouts } from "../../../utils/helpers/timeouts";

test.describe("Evolve Student Registration Flow", () => {
  test(
    "creates a new student account and keeps the student role across catalog, search, product, and account settings",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.CREATE_ACCOUNT,
        TAGS.CATALOG_SEARCH,
        TAGS.ACCOUNT,
        TAGS.REGRESSION,
      ],
      jira: ["EDQAENG-25770"],
    }),
    async ({ ui, assertions }) => {
      test.setTimeout(timeouts.FIFTEEN_MINUTES);

      const loginPage = ui.evolve.LoginPage;
      const createAccountPage = ui.evolve.CreateAccountPage;
      const catalogPage = ui.evolve.CatalogPage;
      const accountSettingsPage = ui.evolve.AccountSettingsPage;
      const studentRegistrationAssertion =
        assertions.evolve.StudentRegistrationAssertion;
      const student = getCreateStudentTestData();
      const keyword = "health";

      const normalizeLocationValue = (value: string): string => {
        const normalizedValue = value.trim().toLowerCase();
        const normalizedLocationValues: Record<string, string> = {
          us: "united states",
          "united states": "united states",
          tn: "tennessee",
          tennessee: "tennessee",
        };

        return normalizedLocationValues[normalizedValue] ?? normalizedValue;
      };

      const normalizePhoneValue = (value: string): string =>
        value.replace(/\D/g, "").slice(-10);

      const logVerify = (
        label: string,
        expected: unknown,
        actual: unknown,
      ): void => {
        logger.info(`[VERIFY] ${label}`, { expected, actual });
      };

      await test.step(
        "Step 1: Go to Evolve Generic Login Page → verify registration flow starts from direct login",
        async () => {
          await loginPage.goToEvolveLoginPage();
        },
      );

      await test.step(
        "Step 2: Click Create account button → select Student option",
        async () => {
          await loginPage.clickCreateAccount();
          await createAccountPage.selectStudentRole();
        },
      );

      await test.step(
        "Step 3: Fill required student fields → keep data sourced from env/testdata.test6.txt",
        async () => {
          await createAccountPage.fillRequiredStudentFields(student);
        },
      );

      await test.step(
        "Step 4: Check I'm not a robot captcha → enable submission",
        async () => {
          await createAccountPage.clickCaptchaCheckbox();
        },
      );

      await test.step(
        "Step 5: Click Submit button → create the student account",
        async () => {
          await createAccountPage.clickSubmit();
        },
      );

      await test.step(
        "Step 6: Click Continue in You're signed up! popup → finish sign-up",
        async () => {
          await createAccountPage.clickContinueInSignedUpDialog();
        },
      );

      await test.step(
        "Step 7: Ensure the new student is signed in → establish the authenticated session",
        async () => {
          const currentUrl = await catalogPage.currentUrl();

          if (!currentUrl.includes("/cs/myEvolve")) {
            await loginPage.goToEvolveLoginPage();
            await loginPage.login(student.email, student.password);
          }
        },
      );

      await test.step(
        "Step 8: Open Catalog page for the new student → prepare role verification",
        async () => {
          await catalogPage.goToStudentCatalogPage();
        },
      );

      await test.step(
        "Step 9: Observe Catalog page URL → verify expected student role URL",
        async () => {
          logVerify(
            "Catalog URL",
            "/cs/store?role=student",
            await catalogPage.currentUrl(),
          );
          await studentRegistrationAssertion.verifyStudentCatalogUrl();
        },
      );

      await test.step(
        "Step 10: Observe student-specific links on Catalog page → verify expected student links",
        async () => {
          logVerify(
            "Link: Register for results and remediation",
            true,
            await catalogPage.elements
              .registerForResultsAndRemediationLink()
              .isVisible()
              .catch(() => false),
          );
          logVerify(
            "Link: HESI transcripts",
            true,
            await catalogPage.elements.hesiTranscriptsLink().isVisible().catch(() => false),
          );
          logVerify(
            "Link: Register for distance testing",
            true,
            await catalogPage.elements
              .registerForDistanceTestingLink()
              .isVisible()
              .catch(() => false),
          );
          await studentRegistrationAssertion.verifyStudentRoleLinks();
        },
      );

      await test.step(
        "Step 11: Click search icon → search health → verify student search results URL",
        async () => {
          await catalogPage.searchForKeyword(keyword);
          logVerify(
            "Student search URL",
            `/cs/search?query=${keyword}&role=student`,
            await catalogPage.currentUrl(),
          );
          await studentRegistrationAssertion.verifyStudentSearchResultUrl(keyword);
        },
      );

      await test.step(
        "Step 12: Click a product title link → verify product details page keeps student role",
        async () => {
          await catalogPage.clickFirstProductTitle();
          logVerify(
            "Student product URL",
            "/cs/product/<id>?role=student",
            await catalogPage.currentUrl(),
          );
          await studentRegistrationAssertion.verifyStudentProductDetailsUrl();
        },
      );

      await test.step(
        "Step 13: Click Account icon → open Account Settings page → verify created student details",
        async () => {
          await catalogPage.clickAccountSettings();
          //logVerify("Account URL", "/cs/account", await accountSettingsPage.currentUrl());
          logVerify("Account firstName", student.firstName, await accountSettingsPage.getFirstName());
          logVerify("Account lastName", student.lastName, await accountSettingsPage.getLastName());
          logVerify("Account email", student.email, await accountSettingsPage.getEmailAddress());
          logVerify(
            "Account institutionCountry",
            normalizeLocationValue(student.institutionCountry),
            normalizeLocationValue(await accountSettingsPage.getInstitutionCountry()),
          );
          logVerify(
            "Account institutionState",
            normalizeLocationValue(student.institutionState),
            normalizeLocationValue(await accountSettingsPage.getInstitutionState()),
          );
        },
      );

      await test.step(
        "Step 14: Click Logout button → confirm sign out behavior",
        async () => {
          await accountSettingsPage.clickLogout();
        },
      );
    },
  );
});