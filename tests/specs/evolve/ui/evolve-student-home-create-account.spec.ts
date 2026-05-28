import { test } from "tests/fixtures/merged.fixture";
import { logger } from "utils/helpers/logger";
import { getCreateStudentTestData } from "utils/helpers/create-student-testdata";
import { meta, TAGS } from "utils/helpers/tags";
import { timeouts } from "utils/helpers/timeouts";

test.describe("Evolve Student Home Registration Flow", () => {
  test(
    "creates a new student account from the home page and keeps the student role across catalog, search, product, and account settings",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.CREATE_ACCOUNT,
        TAGS.CATALOG_SEARCH,
        TAGS.ACCOUNT,
        TAGS.REGRESSION,
      ],
      jira: ["EDQAENG-25751"],
    }),
    async ({ ui, assertions }) => {
      test.setTimeout(timeouts.FIFTEEN_MINUTES);

      const loginPage = ui.evolve.LoginPage;
      const createAccountPage = ui.evolve.CreateAccountPage;
      const catalogPage = ui.evolve.CatalogPage;
      const accountSettingsPage = ui.evolve.AccountSettingsPage;
      const studentRegistrationAssertion =
        assertions.evolve.StudentRegistrationAssertion;
      const student = getCreateStudentTestData({ preserveEmailDomain: true });
      const keyword = "health";

      const logVerify = (
        label: string,
        expected: unknown,
        actual: unknown,
      ): void => {
        logger.info(`[VERIFY] ${label}`, { expected, actual });
      };

      await test.step(
        "Step 1: Go to Evolve home page → start from /cs/",
        async () => {
          await loginPage.goToEvolveHomePage();
        },
      );

      await test.step(
        "Step 2: Click I'm a Student → open the student landing page",
        async () => {
          await loginPage.clickStudentButton();
        },
      );

      await test.step(
        "Step 3: Click Create Account → select Student option",
        async () => {
          await loginPage.clickCreateAccount();
          await createAccountPage.selectStudentRole();
        },
      );

      await test.step(
        "Step 4: Fill required student fields → use env/testdata.test6.txt data",
        async () => {
          await createAccountPage.fillRequiredStudentFields(student);
        },
      );

      await test.step(
        "Step 5: Check I'm not a robot captcha → enable form submission",
        async () => {
          await createAccountPage.clickCaptchaCheckbox();
        },
      );

      await test.step(
        "Step 6: Click Submit button → create the student account",
        async () => {
          await createAccountPage.clickSubmit();
        },
      );

      await test.step(
        "Step 7: Click Continue in You're signed up! popup → complete registration",
        async () => {
          await createAccountPage.clickContinueInSignedUpDialog();
        },
      );

      await test.step(
        "Step 8: Click Catalog button in the header → keep the student session and open Catalog",
        async () => {
          const currentUrl = await catalogPage.currentUrl();

          if (!currentUrl.includes("/cs/myEvolve") && !currentUrl.includes("/cs/store")) {
            await loginPage.goToEvolveLoginPage();
            await loginPage.login(student.email, student.password);
          }

          await catalogPage.clickHeaderCatalog();
        },
      );

      await test.step(
        "Step 9: Observe Catalog page URL → verify expected 1",
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
        "Step 10: Observe student-role links on Catalog page → verify expected 2",
        async () => {
          logVerify(
            "Link: Register for Results and Remediation",
            true,
            await catalogPage.elements
              .registerForResultsAndRemediationLink()
              .isVisible()
              .catch(() => false),
          );
          logVerify(
            "Link: HESI Transcripts",
            true,
            await catalogPage.elements.hesiTranscriptsLink().isVisible().catch(() => false),
          );
          logVerify(
            "Link: Register for Distance Testing",
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
        "Step 11: Click search icon, search health, and press Enter → verify expected 3",
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
        "Step 12: Click any product title link → verify expected 4",
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
        "Step 13: Click Account icon → Account Settings opens → verify expected 5",
        async () => {
          await catalogPage.clickAccountSettings();
          logVerify("Account firstName", student.firstName, await accountSettingsPage.getFirstName());
          logVerify("Account lastName", student.lastName, await accountSettingsPage.getLastName());
          logVerify("Account email", student.email, await accountSettingsPage.getEmailAddress());

          const actualPhone = await accountSettingsPage.getShippingPhone();
          logVerify("Account phone bypassed by precondition", "not displayed", actualPhone || "");
          await studentRegistrationAssertion.verifyStudentIdentityAccountSettings(student, {
            expectPhone: false,
          });
        },
      );
    },
  );
});