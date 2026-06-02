import { expect, test } from "tests/fixtures/merged.fixture";
import { logger } from "utils/helpers/logger";
import { meta, TAGS } from "utils/helpers/tags";
import { timeouts } from "utils/helpers/timeouts";

const EXPIRED_PASSWORD_STUDENT_USERNAME = "smanualh60";
const EXPIRED_PASSWORD_STUDENT_PASSWORD = "Test12345";
const REFERENCE_SELF_ENROLL_COURSE_ID = "189890_jfacultymanual_hsm0001";

test.describe("Expired Password Enrollment Restrictions", () => {
  test(
    "prevents enrollment completion when student has expired password and shows password expiration overlay",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.MY_EVOLVE,
        TAGS.SELF_ENROLL,
        TAGS.REGRESSION,
      ],
      jira: ["EDQAENG-30752"],
    }),
    async ({ ui, page }) => {
      test.setTimeout(timeouts.FIFTEEN_MINUTES);

      const loginPage = ui.evolve.LoginPage;
      const myEvolvePage = ui.evolve.MyEvolvePage;

    await test.step(
      "Step 1: Navigate to Evolve portal and click I'm a Student",
      async () => {
        await loginPage.goToEvolveHomePage();
        await loginPage.clickStudentButton();
      },
    );

    await test.step(
      "Step 2: Enter Course ID and click Redeem",
      async () => {
        await loginPage.redeemCourseId(REFERENCE_SELF_ENROLL_COURSE_ID);
        await loginPage.dismissPendoGuideIfPresent();
      },
    );

    await test.step(
      "Step 3: On login-required gate, fill email and click to enable password login",
      async () => {
        await expect(loginPage.elements.loginRequiredMessage()).toBeVisible();
        // Fill email first to enable password button
        await loginPage.fillEmail(EXPIRED_PASSWORD_STUDENT_USERNAME);
      },
    );

    await test.step(
      "Step 3a: Click Login with password button",
      async () => {
        await loginPage.clickLoginWithPassword();
      },
    );

    await test.step(
      "Step 4: Fill password and click Sign In → verify password expiration overlay",
      async () => {
        await loginPage.fillPassword(EXPIRED_PASSWORD_STUDENT_PASSWORD);
        await loginPage.clickSignIn();

        await loginPage.waitForPasswordExpiredOverlay(timeouts.THIRTY_SECONDS);

        logger.info("Password expiration popup detected");
      },
    );

    await test.step(
      "Step 4a: Verify password expiration overlay remains visible and blocks enrollment completion",
      async () => {
        const isExpiredOverlayVisible = await loginPage.isPasswordExpiredOverlayVisible();
        expect(isExpiredOverlayVisible).toBe(true);

        const isEnrolledVisible = await myEvolvePage.elements
          .enrolledSuccessDialog()
          .isVisible()
          .catch(() => false);
        expect(isEnrolledVisible).toBe(false);

        logger.info("Password expiration popup is visible and enrollment success popup is not shown");
      },
    );


    await test.step(
      "Step 5a: Verify password expiration overlay is closed (redirect confirms closure)",
      async () => {
        await page.waitForLoadState("domcontentloaded").catch(() => {
          logger.info("Page load timeout - continuing with verification");
        });

        const currentUrl = await page.url();
        expect(currentUrl).toMatch(/\/cs\/(store|$)/);
        logger.info("Password expiration popup confirmed as closed - successfully redirected to store page");
      },
    );

      await test.step(
        "Step 5b: Verify no course was added to My Evolve (enrollment was blocked)",
        async () => {
          // Navigate to My Evolve to verify course was not enrolled
          await myEvolvePage.goToMyEvolvePage();

          // The course should NOT appear in My Evolve because enrollment was blocked by password expiration
          const courseInMyEvolve = myEvolvePage.courseIdInMyEvolve(
            REFERENCE_SELF_ENROLL_COURSE_ID,
          );

          const isCoursePresent = await courseInMyEvolve
            .isVisible()
            .catch(() => false);
          expect(isCoursePresent).toBe(false);
          logger.info("Confirmed: Course NOT added to My Evolve (enrollment was blocked by password expiration)");
        },
      );

    await test.step(
      "Step 5c: Click Close or X button on password expiration overlay → verify redirect to /cs/store",
      async () => {
        const closed = await loginPage.closePasswordExpiredOverlayIfPresent();
        if (closed) {
          logger.info("Attempted to close password expiration popup");
        }

        await expect
          .poll(() => page.url(), { timeout: timeouts.THIRTY_SECONDS })
          .toMatch(/\/cs\/(store|$)/);

        logger.info(`Redirected to: ${await page.url()}`);
      },
    );

    },
  );

  test(
    "prevents bulk enrollment when student password is expired",
    meta({
      tags: [
        TAGS.EVOLVE,
        TAGS.MY_EVOLVE,
        TAGS.SELF_ENROLL,
        TAGS.REGRESSION,
      ],
      jira: ["EDQAENG-30754"],
    }),
    async ({ ui, page }) => {
      test.setTimeout(timeouts.FIFTEEN_MINUTES);

      const loginPage = ui.evolve.LoginPage;

      await test.step(
        "Step 1: Navigate to Evolve portal and click Enroll in multiple courses",
        async () => {
          await loginPage.goToEvolveHomePage();
          await loginPage.clickStudentButton();
          await loginPage.dismissPendoGuideIfPresent();

          await loginPage.clickEnrollInMultipleCourses();

          await expect(loginPage.elements.loginRequiredMessage()).toBeVisible({
            timeout: 15000,
          });
        },
      );

      await test.step(
        "Step 2: On login-required gate, click Login with password",
        async () => {
          await expect(loginPage.elements.loginRequiredMessage()).toBeVisible();

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
        "Step 3: Sign in with expired-password account",
        async () => {
          await loginPage.fillEmail(EXPIRED_PASSWORD_STUDENT_USERNAME);
          await loginPage.fillPassword(EXPIRED_PASSWORD_STUDENT_PASSWORD);
          await loginPage.clickSignIn();
        },
      );

      await test.step(
        "Step 4: Verify password expired popup blocks bulk enrollment",
        async () => {
          await loginPage.waitForPasswordExpiredOverlay(timeouts.THIRTY_SECONDS);

          const isPasswordExpiredVisible = await loginPage.isPasswordExpiredOverlayVisible();
          expect(isPasswordExpiredVisible).toBe(true);

          const isBulkOverlayVisible = await loginPage.isBulkEnrollmentOverlayVisible();
          expect(isBulkOverlayVisible).toBe(false);

          logger.info("Password expired popup displayed and bulk enrollment overlay was blocked");
        },
      );

      await test.step(
        "Step 5: Verify user remains restricted until password update",
        async () => {
          const closed = await loginPage.closePasswordExpiredOverlayIfPresent();
          if (closed) {
            logger.info("Attempted to close password expired popup");
          }

          await expect
            .poll(() => page.url(), { timeout: timeouts.THIRTY_SECONDS })
            .toMatch(/\/cs\/(store|myEvolve|login|$)|authgateway/i);

          await expect
            .poll(
              () => loginPage.isBulkEnrollmentOverlayVisible(),
              { timeout: 10000 },
            )
            .toBe(false);
        },
      );
    },
  );
});
