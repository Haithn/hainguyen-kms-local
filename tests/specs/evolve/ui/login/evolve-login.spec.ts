import { test } from "../../../../fixtures/merged.fixture";
import { randomEmail } from "../../../../../utils/helpers/string";
import { meta, TAGS } from "../../../../../utils/helpers/tags";

test.describe("Evolve Sign-In Flow", () => {
  test(
    "Verify sign-in form controls from main page and generic login page",
    meta({
      tags: [TAGS.EVOLVE, TAGS.LOGIN, TAGS.SMOKE],
      jira: ["EDQAENG-29640"],
    }),
    async ({ ui, assertions }) => {
      // Arrange
      const loginPage = ui.evolve.LoginPage;
      const loginAssertion = assertions.evolve.LoginAssertion;
      await loginPage.goToEvolveHomePage();

      await test.step("Step 1: Click Sign In in header → verify initial state", async () => {
        // Act
        await loginPage.clickHeaderSignIn();
        // Assert
        await loginAssertion.verifyInitialState();
      });

      await test.step("Step 2: Enter email → click Send Passcode → verify OTP sent state", async () => {
        // Act
        await loginPage.fillEmail(randomEmail());
        await loginPage.clickGetAOneTimeCode();
        // Assert
        await loginAssertion.verifyOtpSentState();
      });

      await test.step("Step 3: Switch to password login → verify password login state", async () => {
        // Act
        await loginPage.clickLoginWithPassword();
        // Assert
        await loginAssertion.verifyPasswordLoginState();
      });

      await test.step("Step 4: Re-request OTP → verify OTP sent state (code re-sent, email retained)", async () => {
        // Act
        await loginPage.clickGetAOneTimeCode();
        // Assert
        await loginAssertion.verifyOtpSentState();
      });

      await test.step("Step 5: Navigate to generic login page → verify initial state", async () => {
        // Act
        await loginPage.goToEvolveLoginPage();
        // Assert
        await loginAssertion.verifyInitialState(false, false);
      });

      await test.step("Step 6: Enter email → click Send Passcode → verify OTP sent state", async () => {
        // Act
        await loginPage.fillEmail(randomEmail());
        await loginPage.clickGetAOneTimeCode();
        // Assert
        await loginAssertion.verifyOtpSentState(false);
      });

      await test.step("Step 7: Switch to password login → verify password login state", async () => {
        // Act
        await loginPage.clickLoginWithPassword();
        // Assert
        await loginAssertion.verifyPasswordLoginState(false);
      });

      await test.step("Step 8: Re-request OTP → verify OTP sent state (code re-sent, email retained)", async () => {
        // Act
        await loginPage.clickGetAOneTimeCode();
        // Assert
        await loginAssertion.verifyOtpSentState(false);
      });
    },
  );
});
