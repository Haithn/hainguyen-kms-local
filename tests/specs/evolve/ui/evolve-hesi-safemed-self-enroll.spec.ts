import { expect, test } from "../../fixtures/merged.fixture";
import { MyEvolvePage } from "../../../page-objects/pages/evolve/my-evolve.page";
import { getCreateStudentTestData } from "../../../utils/helpers/create-student-testdata";
import { meta, TAGS } from "../../../utils/helpers/tags";
import { timeouts } from "../../../utils/helpers/timeouts";

const HESI_SAFEMED_COURSE_ID = "175352_cfacultymanual_hsm0001";
const INSTRUCTOR_LED_PRODUCT_TYPE = "Instructor-Led Course";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const tokenParts = token.split(".");
    if (tokenParts.length < 2) {
      return null;
    }

    const payloadBase64Url = tokenParts[1];
    const payloadBase64 = payloadBase64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadBase64Url.length / 4) * 4, "=");

    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf8");
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractDestinationIsbnDigits(destinationUrl: string): string {
  try {
    const url = new URL(destinationUrl);
    const tokenCandidates: string[] = [];

    const topToken = url.searchParams.get("token");
    if (topToken) {
      tokenCandidates.push(topToken);
    }

    const returnToken = url.searchParams.get("returnToken");
    if (returnToken) {
      tokenCandidates.push(returnToken);
    }

    const nestedTargetUrl = url.searchParams.get("targetUrl");
    if (nestedTargetUrl) {
      const decodedTargetUrl = decodeURIComponent(nestedTargetUrl);
      const nestedUrl = new URL(decodedTargetUrl);
      const nestedReturnToken = nestedUrl.searchParams.get("returnToken");
      if (nestedReturnToken) {
        tokenCandidates.push(nestedReturnToken);
      }
    }

    const hashQuery = url.hash.includes("?")
      ? url.hash.slice(url.hash.indexOf("?") + 1)
      : "";

    if (hashQuery) {
      const hashParams = new URLSearchParams(hashQuery);
      const hashToken = hashParams.get("token");
      if (hashToken) {
        tokenCandidates.push(hashToken);
      }

      const hashReturnToken = hashParams.get("returnToken");
      if (hashReturnToken) {
        tokenCandidates.push(hashReturnToken);
      }

      const hashTargetUrl = hashParams.get("targetUrl");
      if (hashTargetUrl) {
        const decodedHashTargetUrl = decodeURIComponent(hashTargetUrl);
        const nestedHashTargetUrl = new URL(decodedHashTargetUrl);
        const nestedHashReturnToken = nestedHashTargetUrl.searchParams.get("returnToken");
        if (nestedHashReturnToken) {
          tokenCandidates.push(nestedHashReturnToken);
        }
      }
    }

    for (const token of tokenCandidates) {
      const payload = decodeJwtPayload(token);
      const user = payload?.user as Record<string, unknown> | undefined;
      const appParams = user?.appParams as Record<string, unknown> | undefined;
      const isbns = appParams?.isbns;

      if (typeof isbns === "string" && isbns.trim()) {
        return isbns.replace(/\D/g, "");
      }
    }

    return "";
  } catch {
    return "";
  }
}

function normalizeCourseTitleForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/,\s*\d+(st|nd|rd|th)\s+edition/gi, "")
    .replace(/\s*-\s*\d{10,13}$/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

test.describe("HESI SAFEMED Self-Enroll Flow", () => {
  test(
    "self-enrolls new student from catalog and shows course in Instructor-Led Courses tab",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.MY_EVOLVE,
        TAGS.SELF_ENROLL,
        TAGS.CREATE_ACCOUNT,
        TAGS.HESI,
        TAGS.REGRESSION,
      ],
      jira: ["EDQAENG-30242"],
    }),
    async ({ ui, page }) => {
      test.setTimeout(timeouts.FIFTEEN_MINUTES);

      const loginPage = ui.evolve.LoginPage;
      const createAccountPage = ui.evolve.CreateAccountPage;
      const myEvolvePage = ui.evolve.MyEvolvePage;
      const student = getCreateStudentTestData();
      let expectedCourseTitle = "";
      let expectedCourseIsbnDigits = "";
      let contentPage = page;

      await test.step(
        "Step 1: Go to /cs/ as anonymous user and click I'm a Student",
        async () => {
          await loginPage.goToEvolveHomePage();
          await loginPage.clickStudentButton();
        },
      );

      await test.step(
        "Step 2: Enter HESI SAFEMED course ID and click Submit",
        async () => {
          await loginPage.redeemCourseId(HESI_SAFEMED_COURSE_ID);
        },
      );

      await test.step(
        "Step 3: On login-required gate, click Create an account",
        async () => {
          await expect(loginPage.elements.loginRequiredMessage()).toBeVisible();

          const isPendoVisible = await loginPage.elements
            .pendoTextContainer()
            .isVisible()
            .catch(() => false);
          if (isPendoVisible) {
            await page.keyboard.press("Escape");
          }

          await loginPage.clickCreateAccountFromGate();
        },
      );

      await test.step(
        "Step 4: Select Student and fill all required registration fields",
        async () => {
          await createAccountPage.selectStudentRole();
          await createAccountPage.fillRequiredStudentFields(student);
        },
      );

      await test.step(
        "Step 5: Complete captcha and submit account creation",
        async () => {
          await createAccountPage.clickCaptchaCheckbox();
          await createAccountPage.clickSubmit();
        },
      );

      await test.step(
        "Step 6: Click Continue on You're Signed Up popup",
        async () => {
          await createAccountPage.clickContinueInSignedUpDialog();
        },
      );

      await test.step(
        "Step 7: Click Continue on You're Enrolled popup and verify Instructor-Led Courses tab",
        async () => {
          await expect(myEvolvePage.elements.enrolledSuccessDialog()).toBeVisible();
          await myEvolvePage.clickContinueOnEnrolledDialog();

          await expect
            .poll(() => myEvolvePage.currentUrl(), { timeout: 20000 })
            .toContain("/cs/myEvolve");

          await myEvolvePage.openInstructorLedCoursesTab();
          await expect
            .poll(() => myEvolvePage.isInstructorLedCoursesTabSelected())
            .toBe(true);
        },
      );

      await test.step(
        "Step 8: Verify enrolled course card details under Instructor-Led Courses",
        async () => {
          expectedCourseTitle = (
            await myEvolvePage.courseCardTitleLink(HESI_SAFEMED_COURSE_ID).innerText()
          ).trim();

          const courseIsbnText = await myEvolvePage
            .courseCardIsbn(HESI_SAFEMED_COURSE_ID)
            .innerText();
          expectedCourseIsbnDigits = courseIsbnText.replace(/\D/g, "");

          await expect(
            myEvolvePage.courseCardThumbnail(HESI_SAFEMED_COURSE_ID),
          ).toBeVisible();
          await expect(
            myEvolvePage.courseCardProductType(
              HESI_SAFEMED_COURSE_ID,
              INSTRUCTOR_LED_PRODUCT_TYPE,
            ),
          ).toBeVisible();
          await expect(
            myEvolvePage.courseCardTitleLink(HESI_SAFEMED_COURSE_ID),
          ).toBeVisible();
          await expect(
            myEvolvePage.courseCardAuthor(HESI_SAFEMED_COURSE_ID),
          ).toBeVisible();
          await expect(
            myEvolvePage.courseCardIsbn(HESI_SAFEMED_COURSE_ID),
          ).toBeVisible();
          await expect(
            myEvolvePage.courseCardId(HESI_SAFEMED_COURSE_ID),
          ).toBeVisible();
          await expect(
            myEvolvePage.courseCardInstructor(HESI_SAFEMED_COURSE_ID),
          ).toBeVisible();
          await expect(
            myEvolvePage.courseCardAccessEndDate(HESI_SAFEMED_COURSE_ID),
          ).toHaveCount(0);
        },
      );

      await test.step(
        "Step 9: Click course title, accept Terms and Conditions if shown, then verify redeem/purchase navigation",
        async () => {
          await myEvolvePage.clickCourseTitleInMyEvolve(HESI_SAFEMED_COURSE_ID);

          const currentUrl = await myEvolvePage.currentUrl();
          if (/\/cs\/termsAndConditions/i.test(currentUrl)) {
            const contentTabPromise = page.context().waitForEvent("page");
            await myEvolvePage.agreeTermsAndConditionsIfPresent();

            const contentTab = await contentTabPromise;
            await contentTab.waitForLoadState("domcontentloaded");
            contentPage = contentTab;
            await expect
              .poll(() => contentTab.url(), { timeout: 20000 })
              .toMatch(/(\/cs\/(product|purchase|redeem)|#\/(purchase|redeem)|authgateway.*purchase)/i);
            return;
          }

          contentPage = page;
          await expect
            .poll(() => myEvolvePage.currentUrl(), { timeout: 20000 })
            .toMatch(/(\/cs\/(product|purchase|redeem)|#\/(purchase|redeem)|authgateway.*purchase)/i);
        },
      );

      await test.step(
        "Step 10: On Redeem/Purchase page, verify course name and ISBN match Step 8",
        async () => {
          const destinationUrl = contentPage.url();
          expect(destinationUrl).toMatch(/(\/cs\/(product|purchase|redeem)|#\/(purchase|redeem)|authgateway.*purchase)/i);

          const contentMyEvolvePage =
            contentPage === page ? myEvolvePage : new MyEvolvePage(contentPage);

          await expect(contentMyEvolvePage.elements.redeemPurchaseCollectionItem()).toBeVisible({
            timeout: 20000,
          });

          const collectionText = (await contentMyEvolvePage.getRedeemPurchaseCollectionText())
            .replace(/\s+/g, " ")
            .trim();
          const normalizedExpectedTitle = normalizeCourseTitleForMatch(expectedCourseTitle);
          const normalizedCollectionTitle = normalizeCourseTitleForMatch(collectionText);

          expect(normalizedCollectionTitle).toContain(normalizedExpectedTitle);

          const destinationIsbnDigitsFromCollection =
            await contentMyEvolvePage.getRedeemPurchaseCollectionIsbnDigits();
          expect(destinationIsbnDigitsFromCollection).toContain(expectedCourseIsbnDigits);
        },
      );
    },
  );
});